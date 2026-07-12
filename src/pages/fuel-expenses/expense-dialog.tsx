import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import type { Vehicle, Trip } from "@/lib/types";
import { toast } from "sonner";
import { Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ExpenseDialog({
  open,
  onOpenChange,
  onSuccess,
}: ExpenseDialogProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);

  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [selectedTripId, setSelectedTripId] = useState("");
  const [category, setCategory] = useState("Toll");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchVehicles() {
      if (!open) return;
      setLoading(true);
      const { data } = await supabase
        .from("vehicles")
        .select("*")
        .neq("status", "Retired")
        .order("registration_number");

      if (data) {
        setVehicles(data as Vehicle[]);
      }
      setLoading(false);
    }
    fetchVehicles();

    setSelectedVehicleId("");
    setSelectedTripId("");
    setCategory("Toll");
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
    setErrors({});
  }, [open]);

  useEffect(() => {
    async function fetchVehicleTrips() {
      if (!selectedVehicleId) {
        setTrips([]);
        setSelectedTripId("");
        return;
      }

      const { data } = await supabase
        .from("trips")
        .select("*")
        .eq("vehicle_id", selectedVehicleId)
        .order("created_at", { ascending: false });

      if (data) {
        setTrips(data as Trip[]);
      }
    }
    fetchVehicleTrips();
  }, [selectedVehicleId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!selectedVehicleId) newErrors.vehicleId = "Please select a vehicle";

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = "Amount must be a positive number";
    }

    if (!category.trim()) newErrors.category = "Category is required";
    if (!date) newErrors.date = "Date is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("expenses").insert([
        {
          vehicle_id: selectedVehicleId,
          trip_id: selectedTripId || null,
          category: category.trim(),
          amount: parsedAmount,
          expense_date: date,
        },
      ]);

      if (error) {
        throw new Error(error.message);
      }

      toast.success("Expense recorded successfully");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Failed to log expense", { description: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Record Expense</DialogTitle>
          <DialogDescription>
            Log tolls or miscellaneous expenses. Maintenance costs are logged
            automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Vehicle *
            </label>
            {loading ? (
              <div className="h-9 w-full animate-pulse bg-muted rounded" />
            ) : (
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className={`flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                  errors.vehicleId ? "border-destructive" : "border-input"
                }`}
              >
                <option value="">Select a Vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name_model} ({v.registration_number})
                  </option>
                ))}
              </select>
            )}
            {errors.vehicleId && (
              <p className="text-xs text-destructive">{errors.vehicleId}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Associated Trip (Optional)
            </label>
            <select
              value={selectedTripId}
              disabled={!selectedVehicleId}
              onChange={(e) => setSelectedTripId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            >
              <option value="">No Associated Trip</option>
              {trips.map((t, idx) => (
                <option key={t.id} value={t.id}>
                  TR{String(trips.length - idx).padStart(3, "0")} ({t.source} →{" "}
                  {t.destination}) · {t.status}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="Toll">Toll</option>
                <option value="Misc">Misc</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Amount *
              </label>
              <div className="relative flex items-center">
                  <span className="absolute left-2.5 text-xs text-muted-foreground pointer-events-none select-none">
                    ₹
                  </span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 15.50"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`flex h-9 w-full rounded-md border bg-transparent pl-6 pr-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                    errors.amount ? "border-destructive" : "border-input"
                  }`}
                />
              </div>
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Expense Date *
            </label>
            <div className="relative flex items-center date-input-premium">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`flex h-9 w-full rounded-md border bg-transparent pl-3 pr-9 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                  errors.date ? "border-destructive" : "border-input"
                }`}
              />
              <Calendar className="absolute right-3 top-2.5 size-4 text-muted-foreground pointer-events-none select-none" />
            </div>
            {errors.date && (
              <p className="text-xs text-destructive">{errors.date}</p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || loading}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Log Expense
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
