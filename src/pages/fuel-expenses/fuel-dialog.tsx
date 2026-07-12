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

interface FuelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function FuelDialog({ open, onOpenChange, onSuccess }: FuelDialogProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);

  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [selectedTripId, setSelectedTripId] = useState("");
  const [liters, setLiters] = useState("");
  const [cost, setCost] = useState("");
  const [date, setDate] = useState("");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch all vehicles
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
    setLiters("");
    setCost("");
    setDate(new Date().toISOString().split("T")[0]);
    setErrors({});
  }, [open]);

  // Fetch trips for selected vehicle
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

    const parsedLiters = parseFloat(liters);
    if (isNaN(parsedLiters) || parsedLiters <= 0) {
      newErrors.liters = "Liters must be a positive number";
    }

    const parsedCost = parseFloat(cost);
    if (isNaN(parsedCost) || parsedCost <= 0) {
      newErrors.cost = "Cost must be a positive number";
    }

    if (!date) newErrors.date = "Date is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("fuel_logs").insert([
        {
          vehicle_id: selectedVehicleId,
          trip_id: selectedTripId || null,
          liters: parsedLiters,
          cost: parsedCost,
          log_date: date,
        },
      ]);

      if (error) {
        throw new Error(error.message);
      }

      toast.success("Fuel purchase logged successfully");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Failed to log fuel", { description: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Log Fuel Purchase</DialogTitle>
          <DialogDescription>
            Record fuel refill metrics for a specific fleet vehicle.
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
                Liters *
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 50"
                  value={liters}
                  onChange={(e) => setLiters(e.target.value)}
                  className={`flex h-9 w-full rounded-md border bg-transparent pl-3 pr-12 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                    errors.liters ? "border-destructive" : "border-input"
                  }`}
                />
                <span className="absolute right-2.5 text-[10px] font-bold text-muted-foreground pointer-events-none select-none">
                  liters
                </span>
              </div>
              {errors.liters && (
                <p className="text-xs text-destructive">{errors.liters}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Cost *
              </label>
              <div className="relative flex items-center">
                  <span className="absolute left-2.5 text-xs text-muted-foreground pointer-events-none select-none">
                    ₹
                  </span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 75"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className={`flex h-9 w-full rounded-md border bg-transparent pl-6 pr-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                    errors.cost ? "border-destructive" : "border-input"
                  }`}
                />
              </div>
              {errors.cost && (
                <p className="text-xs text-destructive">{errors.cost}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Purchase Date *
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
              Log Fuel
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
