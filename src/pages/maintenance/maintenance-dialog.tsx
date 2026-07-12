import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import type { Vehicle } from "@/lib/types";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function MaintenanceDialog({
  open,
  onOpenChange,
  onSuccess,
}: MaintenanceDialogProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [cost, setCost] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("In Shop");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchAvailableVehicles() {
      if (!open) return;
      setLoading(true);

      try {
        // 1. Fetch active maintenance logs to get currently "in shop" vehicle IDs
        const { data: activeLogs } = await supabase
          .from("maintenance_logs")
          .select("vehicle_id")
          .eq("status", "In Shop");

        const busyVehicleIds = activeLogs?.map((l) => l.vehicle_id) || [];

        // 2. Fetch non-Retired vehicles
        const { data: fleet } = await supabase
          .from("vehicles")
          .select("*")
          .neq("status", "Retired");

        if (fleet) {
          // Exclude busy vehicles
          const available = (fleet as Vehicle[]).filter(
            (v) => !busyVehicleIds.includes(v.id),
          );
          setVehicles(available);
        }
      } catch (err) {
        console.error("Failed to load vehicles for maintenance:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAvailableVehicles();
    setSelectedVehicleId("");
    setServiceType("");
    setCost("");
    setDate(new Date().toISOString().split("T")[0]);
    setStatus("In Shop");
    setErrors({});
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!selectedVehicleId) newErrors.vehicleId = "Please select a vehicle";
    if (!serviceType.trim()) newErrors.serviceType = "Service type is required";

    const parsedCost = parseFloat(cost);
    if (isNaN(parsedCost) || parsedCost < 0) {
      newErrors.cost = "Cost must be a positive number";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("maintenance_logs").insert([
        {
          vehicle_id: selectedVehicleId,
          description: serviceType.trim(),
          cost: parsedCost,
          status: status,
          opened_at: date,
        },
      ]);

      if (error) {
        throw new Error(error.message);
      }

      toast.success("Maintenance record logged and vehicle set to In Shop");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Failed to log maintenance", { description: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Log Maintenance</DialogTitle>
          <DialogDescription>
            Record vehicle maintenance. The vehicle status will automatically
            flip to 'In Shop'.
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
                    {v.name_model} ({v.registration_number}) · Status:{" "}
                    {v.status}
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
              Service Type *
            </label>
            <input
              type="text"
              placeholder="e.g. Oil Change"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                errors.serviceType ? "border-destructive" : "border-input"
              }`}
            />
            {errors.serviceType && (
              <p className="text-xs text-destructive">{errors.serviceType}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Cost *
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-2.5 text-xs text-muted-foreground pointer-events-none select-none">
                $
              </span>
              <input
                type="number"
                placeholder="e.g. 2500"
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

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="In Shop">In Shop</option>
              <option value="Completed">Completed</option>
            </select>
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
              Log Maintenance
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
