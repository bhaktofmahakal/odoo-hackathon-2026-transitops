import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import type { MaintenanceLog, Vehicle } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { canWrite } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/loading-skeleton";
import { toast } from "sonner";
import { Wrench, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MaintenancePage() {
  const { role } = useAuth();
  const isManager = role && canWrite(role, "maintenance");

  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [cost, setCost] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("In Shop");
  const [saving, setSaving] = useState(false);

  const fetchLogsAndVehicles = async () => {
    setLoading(true);

    const { data: logData, error: logError } = await supabase
      .from("maintenance_logs")
      .select("*, vehicles(registration_number, name_model)")
      .order("opened_at", { ascending: false });

    if (logError) {
      toast.error("Failed to load maintenance logs", {
        description: logError.message,
      });
    } else if (logData) {
      setLogs(logData as MaintenanceLog[]);
    }

    const { data: vehicleData } = await supabase
      .from("vehicles")
      .select("*")
      .neq("status", "Retired")
      .order("registration_number");

    if (vehicleData) {
      setVehicles(vehicleData as Vehicle[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchLogsAndVehicles();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isManager) return;

    if (!selectedVehicleId) {
      toast.error("Please select a vehicle");
      return;
    }
    if (!serviceType.trim()) {
      toast.error("Please enter service type");
      return;
    }

    const parsedCost = parseFloat(cost);
    if (isNaN(parsedCost) || parsedCost < 0) {
      toast.error("Cost must be a positive number");
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

      if (error) throw new Error(error.message);

      toast.success("Maintenance record logged");
      setSelectedVehicleId("");
      setServiceType("");
      setCost("");
      setDate(new Date().toISOString().split("T")[0]);
      setStatus("In Shop");
      fetchLogsAndVehicles();
    } catch (err: any) {
      toast.error("Failed to log maintenance", { description: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleCloseMaintenance(logId: string) {
    if (!isManager) return;

    const confirmed = window.confirm(
      "Mark this maintenance as Completed? Vehicle will be released back to Available.",
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("maintenance_logs")
        .update({ status: "Completed", closed_at: new Date().toISOString() })
        .eq("id", logId);

      if (error) throw new Error(error.message);

      toast.success("Maintenance completed. Vehicle returned to Available.");
      fetchLogsAndVehicles();
    } catch (err: any) {
      toast.error("Failed to complete maintenance", { description: err.message });
    }
  }

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden">
      {/* Left side — Log Service Record Form */}
      <div className="w-full lg:w-[380px] border-r bg-card flex flex-col overflow-y-auto p-6 flex-shrink-0">
        <div className="mb-6">
          <h2 className="text-lg font-bold tracking-tight">Log Service Record</h2>
        </div>

        {isManager ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Vehicle *
              </label>
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select a Vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name_model} ({v.registration_number})
                  </option>
                ))}
              </select>
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
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
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
                  placeholder="e.g. 2500"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent pl-6 pr-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
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

            <Button
              type="submit"
              disabled={saving}
              className="w-full mt-4"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </form>
        ) : (
          <EmptyState
            title="Read-only mode"
            description="Only managers can log maintenance records."
            className="p-6 border-dashed"
          />
        )}
      </div>

      {/* Right side — Service Log Table */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <div className="border-b p-6 flex-shrink-0">
          <h1 className="text-xl font-bold tracking-tight">Service Log</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <TableSkeleton rows={5} columns={4} />
          ) : logs.length === 0 ? (
            <EmptyState
              icon={<Wrench className="size-6 text-muted-foreground" />}
              title="No maintenance logs"
              description="Log your first service record to get started"
            />
          ) : (
            <div className="rounded-xl border bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/20">
                    <th className="pb-3 pt-3 px-4">Vehicle</th>
                    <th className="pb-3 pt-3 px-4">Service</th>
                    <th className="pb-3 pt-3 px-4">Cost</th>
                    <th className="pb-3 pt-3 px-4">Status</th>
                    {isManager && <th className="pb-3 pt-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold">
                        {log.vehicles?.name_model ?? "—"}{" "}
                        <span className="text-xs text-muted-foreground font-normal">
                          ({log.vehicles?.registration_number ?? "—"})
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {log.description}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-foreground">
                        {formatCurrency(log.cost)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={log.status} />
                      </td>
                      {isManager && (
                        <td className="py-3 px-4 text-right">
                          {log.status === "In Shop" && (
                            <Button
                              size="sm"
                              onClick={() => handleCloseMaintenance(log.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 h-8"
                            >
                              <CheckCircle className="size-3.5 mr-1" />
                              Complete
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Flow diagram and note - below the two columns on larger screens */}
      <div className="absolute bottom-0 left-[380px] right-0 bg-background border-t p-4 hidden lg:block">
        <div className="flex items-center justify-center gap-6 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Available</span>
            <span className="text-xs text-muted-foreground">→ (quality maintenance record) →</span>
            <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">In Shop</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">In Shop</span>
            <span className="text-xs text-muted-foreground">→ (maintenance completed) →</span>
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Available</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground italic text-center">
          Note: In Shop vehicles are removed from the dispatch pool.
        </p>
      </div>
    </div>
  );
}
