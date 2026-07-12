import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { FuelLog, Expense, VehicleReport } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { canWrite } from "@/lib/permissions";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/loading-skeleton";
import { FuelDialog } from "./fuel-dialog";
import { ExpenseDialog } from "./expense-dialog";
import { toast } from "sonner";
import { Fuel, Receipt, Plus, DollarSign, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FuelExpensesPage() {
  const { role } = useAuth();
  // fleet_manager and driver can write fuel/expenses
  const isAuthorized =
    role &&
    (canWrite(role, "fuel_logs") ||
      role === "driver" ||
      role === "fleet_manager");

  const [activeTab, setActiveTab] = useState<"fuel" | "expenses" | "summary">(
    "fuel",
  );

  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicleSummary, setVehicleSummary] = useState<VehicleReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog open triggers
  const [fuelDialogOpen, setFuelDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);

    try {
      // 1. Fetch Fuel Logs
      const { data: fuelData } = await supabase
        .from("fuel_logs")
        .select("*, vehicles(registration_number, name_model)")
        .order("log_date", { ascending: false });

      if (fuelData) setFuelLogs(fuelData as FuelLog[]);

      // 2. Fetch Expenses
      const { data: expenseData } = await supabase
        .from("expenses")
        .select("*, vehicles(registration_number, name_model)")
        .order("expense_date", { ascending: false });

      if (expenseData) setExpenses(expenseData as Expense[]);

      // 3. Fetch View-based operational costs summary
      const { data: summaryData } = await supabase
        .from("v_vehicle_report")
        .select("*");

      if (summaryData) setVehicleSummary(summaryData as VehicleReport[]);
    } catch (err: any) {
      toast.error("Failed to load logs", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute overall aggregates
  const totalFuelCost = fuelLogs.reduce(
    (sum, item) => sum + Number(item.cost),
    0,
  );
  const totalMiscCost = expenses.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );
  const totalFuelLiters = fuelLogs.reduce(
    (sum, item) => sum + Number(item.liters),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Fuel & Expense Registry
          </h1>
          <p className="text-sm text-muted-foreground">
            Track fuel efficiency, tolls, maintenance costs, and total fleet
            operational costs.
          </p>
        </div>

        {isAuthorized && (
          <div className="flex items-center gap-2 self-start">
            <Button
              onClick={() => setFuelDialogOpen(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5"
            >
              <Plus className="size-4" />
              Log Fuel
            </Button>
            <Button
              onClick={() => setExpenseDialogOpen(true)}
              size="sm"
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700"
            >
              <Plus className="size-4" />
              Log Expense
            </Button>
          </div>
        )}
      </div>

      {/* Aggregates row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
            <Fuel className="size-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Fuel Cost
            </p>
            <p className="text-2xl font-bold font-mono">
              $
              {totalFuelCost.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
            <Receipt className="size-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tolls & Misc Expenses
            </p>
            <p className="text-2xl font-bold font-mono">
              $
              {totalMiscCost.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
            <Gauge className="size-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Fuel Liters
            </p>
            <p className="text-2xl font-bold font-mono">
              {totalFuelLiters.toLocaleString()} L
            </p>
          </div>
        </div>
      </div>

      {/* Tabs selector */}
      <div className="flex rounded-lg border bg-muted p-0.5 text-sm w-full max-w-sm">
        <button
          onClick={() => setActiveTab("fuel")}
          className={`flex-1 rounded-md py-1.5 font-medium transition-colors ${
            activeTab === "fuel"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground"
          }`}
        >
          Fuel Logs
        </button>
        <button
          onClick={() => setActiveTab("expenses")}
          className={`flex-1 rounded-md py-1.5 font-medium transition-colors ${
            activeTab === "expenses"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground"
          }`}
        >
          Expenses
        </button>
        <button
          onClick={() => setActiveTab("summary")}
          className={`flex-1 rounded-md py-1.5 font-medium transition-colors ${
            activeTab === "summary"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground"
          }`}
        >
          Cost Summary
        </button>
      </div>

      {/* Loading Skeletons */}
      {loading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : (
        <>
          {/* Fuel Logs Tab */}
          {activeTab === "fuel" &&
            (fuelLogs.length === 0 ? (
              <EmptyState
                icon={<Fuel className="size-6" />}
                title="No fuel logs found"
                description="Refill logs mapped from completed trips or custom logs will be displayed here."
              />
            ) : (
              <div className="rounded-xl border bg-card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/20">
                      <th className="pb-3 pt-3 px-4">Vehicle</th>
                      <th className="pb-3 pt-3 px-4 font-mono">Liters</th>
                      <th className="pb-3 pt-3 px-4 font-mono">Cost</th>
                      <th className="pb-3 pt-3 px-4">Log Date</th>
                      <th className="pb-3 pt-3 px-4">Trip Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {fuelLogs.map((log) => (
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
                        <td className="py-3 px-4 text-muted-foreground font-mono">
                          {log.liters} L
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold">
                          ${log.cost}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-mono">
                          {log.log_date}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-amber-500 font-medium">
                          {log.trip_id ? "Trip Mapped" : "Manual Log"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          {/* Expenses Tab */}
          {activeTab === "expenses" &&
            (expenses.length === 0 ? (
              <EmptyState
                icon={<Receipt className="size-6" />}
                title="No expenses found"
                description="Tolls, miscellaneous items, and maintenance invoices are captured here."
              />
            ) : (
              <div className="rounded-xl border bg-card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/20">
                      <th className="pb-3 pt-3 px-4">Vehicle</th>
                      <th className="pb-3 pt-3 px-4">Category</th>
                      <th className="pb-3 pt-3 px-4 font-mono">Amount</th>
                      <th className="pb-3 pt-3 px-4">Expense Date</th>
                      <th className="pb-3 pt-3 px-4">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {expenses.map((exp) => (
                      <tr
                        key={exp.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-3 px-4 font-semibold">
                          {exp.vehicles?.name_model ?? "—"}{" "}
                          <span className="text-xs text-muted-foreground font-normal">
                            ({exp.vehicles?.registration_number ?? "—"})
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                              exp.category === "maintenance"
                                ? "bg-orange-500/15 text-orange-400 border border-orange-500/30"
                                : exp.category === "Toll"
                                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                                  : "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30"
                            }`}
                          >
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-foreground">
                          ${exp.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-mono">
                          {exp.expense_date}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {exp.category === "maintenance"
                            ? "System Automated"
                            : "Manual Entry"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          {/* Cost Summary Tab (View based) */}
          {activeTab === "summary" &&
            (vehicleSummary.length === 0 ? (
              <EmptyState
                icon={<DollarSign className="size-6" />}
                title="No summary data"
                description="Register vehicles and record operational activities to populate cost summaries."
              />
            ) : (
              <div className="rounded-xl border bg-card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/20">
                      <th className="pb-3 pt-3 px-4">Vehicle</th>
                      <th className="pb-3 pt-3 px-4 font-mono">Acq. Cost</th>
                      <th className="pb-3 pt-3 px-4 font-mono">
                        Maintenance Cost
                      </th>
                      <th className="pb-3 pt-3 px-4 font-mono">Fuel Cost</th>
                      <th className="pb-3 pt-3 px-4 font-mono">
                        Total Operational Cost
                      </th>
                      <th className="pb-3 pt-3 px-4 font-mono">ROI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {vehicleSummary.map((summary) => (
                      <tr
                        key={summary.vehicle_id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-3 px-4 font-semibold">
                          {summary.name_model}{" "}
                          <span className="text-xs text-muted-foreground font-normal">
                            ({summary.registration_number})
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-mono">
                          ${summary.acquisition_cost.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-mono">
                          ${summary.total_maintenance_cost.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-mono">
                          ${summary.total_fuel_cost.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-foreground">
                          ${summary.total_operational_cost.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-500">
                          {summary.roi
                            ? `${(summary.roi * 100).toFixed(2)}%`
                            : "0.00%"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
        </>
      )}

      {/* Dialogs */}
      <FuelDialog
        open={fuelDialogOpen}
        onOpenChange={setFuelDialogOpen}
        onSuccess={fetchData}
      />
      <ExpenseDialog
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        onSuccess={fetchData}
      />
    </div>
  );
}
