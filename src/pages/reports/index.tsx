import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { Vehicle, Trip, MaintenanceLog, FuelLog } from "@/lib/types";
import { toast } from "sonner";
import {
  Calendar,
  MapPin,
  Truck,
  TrendingUp,
  DollarSign,
  FileDown,
  Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Papa from "papaparse";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function ReportsPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedRegion, setSelectedRegion] = useState("all");

  const fetchData = async () => {
    setLoading(true);

    const fetchTableData = async (tableName: string) => {
      let allData: any[] = [];
      let from = 0;
      const limit = 1000;
      while (true) {
        const { data, error } = await supabase
          .from(tableName)
          .select("*")
          .order("id")
          .range(from, from + limit - 1);
        if (error) {
          throw new Error(`Failed to load ${tableName}: ${error.message}`);
        }
        if (!data || data.length === 0) break;
        allData = [...allData, ...data];
        if (data.length < limit) break;
        from += limit;
      }
      return allData;
    };

    try {
      const results = await Promise.allSettled([
        fetchTableData("vehicles"),
        fetchTableData("trips"),
        fetchTableData("maintenance_logs"),
        fetchTableData("fuel_logs"),
      ]);

      const errors: string[] = [];

      if (results[0].status === "fulfilled") {
        setVehicles(results[0].value as Vehicle[]);
      } else {
        errors.push(results[0].reason.message);
      }

      if (results[1].status === "fulfilled") {
        setTrips(results[1].value as Trip[]);
      } else {
        errors.push(results[1].reason.message);
      }

      if (results[2].status === "fulfilled") {
        setMaintenanceLogs(results[2].value as MaintenanceLog[]);
      } else {
        errors.push(results[2].reason.message);
      }

      if (results[3].status === "fulfilled") {
        setFuelLogs(results[3].value as FuelLog[]);
      } else {
        errors.push(results[3].reason.message);
      }

      if (errors.length > 0) {
        toast.error("Some reporting data failed to load", {
          description: errors.join("\n"),
        });
      }
    } catch (err: any) {
      toast.error("Failed to load reporting data", {
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const computedReports = useMemo(() => {
    // Normalizes input timestamp or date string into a local YYYY-MM-DD date string
    const getLocalDateStr = (val: string) => {
      if (!val) return "";
      const d = new Date(val);
      if (isNaN(d.getTime())) return "";
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    return vehicles
      .filter((v) => {
        const matchesType = selectedType === "all" || v.type === selectedType;
        const matchesRegion =
          selectedRegion === "all" ||
          (selectedRegion === "empty" && !v.region) ||
          v.region === selectedRegion;
        return matchesType && matchesRegion;
      })
      .map((v) => {
        // Filter trips for this vehicle within date range
        const vehicleTrips = trips.filter((t) => {
          if (t.vehicle_id !== v.id || t.status !== "Completed") return false;
          const tDate = getLocalDateStr(t.completed_at || t.created_at);
          if (startDate && tDate < startDate) return false;
          if (endDate && tDate > endDate) return false;
          return true;
        });

        // Filter fuel logs for this vehicle within date range
        const vehicleFuel = fuelLogs.filter((f) => {
          if (f.vehicle_id !== v.id) return false;
          const fDate = f.log_date; // already YYYY-MM-DD format
          if (startDate && fDate < startDate) return false;
          if (endDate && fDate > endDate) return false;
          return true;
        });

        // Filter maintenance logs for this vehicle within date range
        const vehicleMaint = maintenanceLogs.filter((m) => {
          if (m.vehicle_id !== v.id) return false;
          const mDate = getLocalDateStr(m.opened_at);
          if (startDate && mDate < startDate) return false;
          if (endDate && mDate > endDate) return false;
          return true;
        });

        const totalDistance = vehicleTrips.reduce(
          (sum, t) => sum + Number(t.planned_distance),
          0,
        );
        const totalRevenue = vehicleTrips.reduce(
          (sum, t) => sum + Number(t.revenue || 0),
          0,
        );
        const totalFuelCost = vehicleFuel.reduce(
          (sum, f) => sum + Number(f.cost),
          0,
        );
        const totalFuelLiters = vehicleFuel.reduce(
          (sum, f) => sum + Number(f.liters),
          0,
        );
        const totalMaintenanceCost = vehicleMaint.reduce(
          (sum, m) => sum + Number(m.cost || 0),
          0,
        );

        const totalOperationalCost = totalFuelCost + totalMaintenanceCost;
        const fuelEfficiency =
          totalFuelLiters > 0
            ? Number((totalDistance / totalFuelLiters).toFixed(2))
            : 0;

        const netProfit = totalRevenue - totalOperationalCost;
        const roi =
          v.acquisition_cost > 0
            ? Number((netProfit / v.acquisition_cost).toFixed(5))
            : 0;

        return {
          vehicle_id: v.id,
          registration_number: v.registration_number,
          name_model: v.name_model,
          type: v.type,
          region: v.region,
          status: v.status,
          acquisition_cost: Number(v.acquisition_cost),
          total_distance: totalDistance,
          total_fuel_cost: totalFuelCost,
          total_fuel_liters: totalFuelLiters,
          total_maintenance_cost: totalMaintenanceCost,
          total_revenue: totalRevenue,
          total_operational_cost: totalOperationalCost,
          fuel_efficiency: fuelEfficiency,
          roi: roi,
        };
      });
  }, [
    vehicles,
    trips,
    maintenanceLogs,
    fuelLogs,
    startDate,
    endDate,
    selectedType,
    selectedRegion,
  ]);

  // Extract unique types and regions for filters
  const typesList = useMemo(() => {
    return Array.from(
      new Set(vehicles.map((v) => v.type).filter(Boolean)),
    ) as string[];
  }, [vehicles]);

  const regionsList = useMemo(() => {
    return Array.from(
      new Set(vehicles.map((v) => v.region).filter(Boolean)),
    ) as string[];
  }, [vehicles]);

  const fuelEfficiencyData = useMemo(() => {
    return computedReports
      .filter((r) => r.total_fuel_liters > 0)
      .map((r) => ({
        name: r.registration_number,
        fullName: `${r.name_model} (${r.registration_number})`,
        efficiency: r.fuel_efficiency,
      }))
      .sort((a, b) => b.efficiency - a.efficiency);
  }, [computedReports]);

  const operationalCostData = useMemo(() => {
    return computedReports
      .filter((r) => r.total_operational_cost > 0)
      .map((r) => ({
        name: r.registration_number,
        fullName: `${r.name_model} (${r.registration_number})`,
        Fuel: r.total_fuel_cost,
        Maintenance: r.total_maintenance_cost,
      }));
  }, [computedReports]);
  const handleExportCSV = () => {
    if (computedReports.length === 0) {
      toast.warning("No data available to export");
      return;
    }

    const csvData = computedReports.map((row) => ({
      "Registration Number": row.registration_number,
      "Name/Model": row.name_model,
      "Vehicle Type": row.type,
      "Total Distance (km)": row.total_distance,
      "Total Fuel Cost ($)": row.total_fuel_cost,
      "Total Fuel Liters (L)": row.total_fuel_liters,
      "Total Maintenance Cost ($)": row.total_maintenance_cost,
      "Total Operational Cost ($)": row.total_operational_cost,
      "Total Revenue ($)": row.total_revenue,
      "Fuel Efficiency (km/L)": row.fuel_efficiency,
      "ROI (%)": (row.roi * 100).toFixed(4),
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `fleet_operations_report_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV Report exported successfully");
  };

  const handleExportPDF = () => {
    if (computedReports.length === 0) {
      toast.warning("No data available to export");
      return;
    }

    const doc = new jsPDF();

    // Header Banner
    doc.setFillColor(28, 25, 23); // sleek dark mode gray
    doc.rect(0, 0, 210, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("TransitOps Smart Transport Operations", 14, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(156, 163, 175);
    doc.text(`Fleet Performance & ROI Analytics Report`, 14, 28);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);

    // Meta parameters
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("REPORT FILTERS & CONTEXT:", 14, 48);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `Date Range: ${startDate || "All-Time"} to ${endDate || "All-Time"}`,
      14,
      54,
    );
    doc.text(
      `Vehicle Type: ${selectedType === "all" ? "All Types" : selectedType}`,
      14,
      60,
    );
    doc.text(
      `Region Scope: ${selectedRegion === "all" ? "All Regions" : selectedRegion === "empty" ? "Unassigned" : selectedRegion}`,
      14,
      66,
    );

    const activeFleet = vehicles.filter((v) => v.status !== "Retired").length;
    const busyFleet = vehicles.filter((v) => v.status === "On Trip").length;
    const utilizationRate =
      activeFleet > 0 ? ((busyFleet / activeFleet) * 100).toFixed(1) : "0.0";
    const totalOpsCost = computedReports.reduce(
      (sum, r) => sum + r.total_operational_cost,
      0,
    );

    const validRois = computedReports.filter((r) => r.acquisition_cost > 0);
    const avgRoi =
      validRois.length > 0
        ? validRois.reduce((sum, r) => sum + r.roi, 0) / validRois.length
        : 0;
    const avgRoiPct = `${(avgRoi * 100).toFixed(4)}%`;

    doc.text(
      `Active Fleet: ${activeFleet} vehicles  |  Utilization: ${utilizationRate}%`,
      110,
      54,
    );
    doc.text(
      `Total Operational Cost: $${totalOpsCost.toLocaleString()}  |  Avg ROI Index: ${avgRoiPct}`,
      110,
      60,
    );

    // Table mapping
    autoTable(doc, {
      head: [
        [
          "Vehicle",
          "Type",
          "Distance",
          "Fuel Cost",
          "Maint. Cost",
          "Revenue",
          "Ops Cost",
          "ROI (%)",
        ],
      ],
      body: computedReports.map((row) => [
        `${row.name_model} (${row.registration_number})`,
        row.type,
        `${row.total_distance.toLocaleString()} km`,
        `$${row.total_fuel_cost.toLocaleString()}`,
        `$${row.total_maintenance_cost.toLocaleString()}`,
        `$${row.total_revenue.toLocaleString()}`,
        `$${row.total_operational_cost.toLocaleString()}`,
        `${(row.roi * 100).toFixed(4)}%`,
      ]),
      startY: 74,
      theme: "striped",
      headStyles: { fillColor: [245, 158, 11] }, // Warm Amber brand color!
      styles: { fontSize: 8.5 },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 20 },
        2: { cellWidth: 22 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20 },
        5: { cellWidth: 22 },
        6: { cellWidth: 22 },
        7: { cellWidth: 22, halign: "right" },
      },
    });

    doc.save(
      `fleet_operations_report_${new Date().toISOString().split("T")[0]}.pdf`,
    );
    toast.success("PDF Report exported successfully");
  };
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Reports & Fleet Analytics
        </h1>
        <p className="text-sm text-muted-foreground">
          Analyze fuel efficiency, ROI index, and aggregate operational
          expenses.
        </p>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Loading analytics dashboard...
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-card border rounded-xl p-4">
            <div className="space-y-1">
              <label
                htmlFor="filter-start-date"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"
              >
                <Calendar className="size-3" />
                Start Date
              </label>
              <div className="relative flex items-center date-input-premium">
                <input
                  id="filter-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent pl-3 pr-9 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <Calendar className="absolute right-3 top-2.5 size-4 text-muted-foreground pointer-events-none select-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="filter-end-date"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"
              >
                <Calendar className="size-3" />
                End Date
              </label>
              <div className="relative flex items-center date-input-premium">
                <input
                  id="filter-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent pl-3 pr-9 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <Calendar className="absolute right-3 top-2.5 size-4 text-muted-foreground pointer-events-none select-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="filter-vehicle-type"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"
              >
                <Truck className="size-3" />
                Vehicle Type
              </label>
              <select
                id="filter-vehicle-type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">All Types</option>
                {typesList.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="filter-region"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"
              >
                <MapPin className="size-3" />
                Region
              </label>
              <div className="flex gap-2">
                <select
                  id="filter-region"
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="all">All Regions</option>
                  <option value="empty">Unassigned</option>
                  {regionsList.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                {(startDate ||
                  endDate ||
                  selectedType !== "all" ||
                  selectedRegion !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                      setSelectedType("all");
                      setSelectedRegion("all");
                    }}
                    className="text-xs text-amber-500 hover:text-amber-400"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                <Truck className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Active Fleet
                </p>
                <p className="text-xl font-bold font-mono">
                  {computedReports.filter((r) => r.status !== "Retired").length}
                </p>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
                <Gauge className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Fleet Utilization
                </p>
                <p className="text-xl font-bold font-mono">
                  {(() => {
                    const active = computedReports.filter(
                      (r) => r.status !== "Retired",
                    ).length;
                    const busy = computedReports.filter(
                      (r) => r.status === "On Trip",
                    ).length;
                    return active > 0
                      ? ((busy / active) * 100).toFixed(1)
                      : "0.0";
                  })()}
                  %
                </p>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <DollarSign className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Ops Cost
                </p>
                <p className="text-xl font-bold font-mono">
                  $
                  {computedReports
                    .reduce((sum, r) => sum + r.total_operational_cost, 0)
                    .toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                <TrendingUp className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Avg ROI Index
                </p>
                <p className="text-xl font-bold font-mono">
                  {(() => {
                    const valid = computedReports.filter(
                      (r) => r.acquisition_cost > 0,
                    );
                    const avg =
                      valid.length > 0
                        ? valid.reduce((sum, r) => sum + r.roi, 0) /
                          valid.length
                        : 0;
                    return (avg * 100).toFixed(4);
                  })()}
                  %
                </p>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fuel Efficiency Chart */}
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold leading-none">
                    Fuel Efficiency Ranking
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Average kilometers traveled per liter of fuel (higher is
                    better).
                  </p>
                </div>
              </div>

              {fuelEfficiencyData.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center border border-dashed rounded-lg bg-muted/10 text-xs text-muted-foreground gap-1">
                  <span>No fuel efficiency data for the selected range.</span>
                  <span>Complete trips or add fuel logs to see data here.</span>
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height={288}>
                    <BarChart
                      data={fuelEfficiencyData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="rgba(255,255,255,0.05)"
                      />
                      <XAxis
                        dataKey="name"
                        fontSize={11}
                        stroke="#888888"
                        tickLine={false}
                      />
                      <YAxis
                        fontSize={11}
                        stroke="#888888"
                        unit=" km/L"
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-lg border bg-background p-2.5 shadow-md text-xs space-y-1">
                                <p className="font-semibold">
                                  {payload[0].payload.fullName}
                                </p>
                                <p className="text-amber-500 font-mono">
                                  Efficiency:{" "}
                                  <span className="font-bold">
                                    {payload[0].value}
                                  </span>{" "}
                                  km/L
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        dataKey="efficiency"
                        fill="#f59e0b"
                        radius={[4, 4, 0, 0]}
                      >
                        {fuelEfficiencyData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={index === 0 ? "#10b981" : "#f59e0b"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Operational Cost Structure Chart */}
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold leading-none">
                    Operational Cost Structure
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cost breakdown between Fuel and Maintenance (lower is
                    better).
                  </p>
                </div>
              </div>

              {operationalCostData.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center border border-dashed rounded-lg bg-muted/10 text-xs text-muted-foreground gap-1">
                  <span>No operational cost data for the selected range.</span>
                  <span>Log fuel purchases or close maintenance to see costs here.</span>
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height={288}>
                    <BarChart
                      data={operationalCostData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="rgba(255,255,255,0.05)"
                      />
                      <XAxis
                        dataKey="name"
                        fontSize={11}
                        stroke="#888888"
                        tickLine={false}
                      />
                      <YAxis
                        fontSize={11}
                        stroke="#888888"
                        unit=" $"
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const fuel = payload[0].value;
                            const maint = payload[1].value;
                            const total = Number(fuel) + Number(maint);
                            return (
                              <div className="rounded-lg border bg-background p-2.5 shadow-md text-xs space-y-1">
                                <p className="font-semibold">
                                  {payload[0].payload.fullName}
                                </p>
                                <p className="text-blue-400">Fuel: ${fuel}</p>
                                <p className="text-orange-400">
                                  Maint: ${maint}
                                </p>
                                <div className="border-t pt-1 mt-1 font-bold text-foreground">
                                  Total: ${total}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        height={36}
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 11 }}
                      />
                      <Bar
                        dataKey="Fuel"
                        stackId="a"
                        fill="#3b82f6"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="Maintenance"
                        stackId="a"
                        fill="#f97316"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* ROI & Costs Details Table */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold leading-none">
                  Vehicle Operations & ROI Details
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Detailed operational costs and return on investment index per
                  vehicle.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleExportCSV}
                  variant="outline"
                  size="sm"
                  className="text-xs flex items-center gap-1.5"
                >
                  <FileDown className="size-3.5" />
                  Export CSV
                </Button>
                <Button
                  onClick={handleExportPDF}
                  size="sm"
                  className="text-xs flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700"
                >
                  <FileDown className="size-3.5" />
                  Export PDF
                </Button>
              </div>
            </div>

            <div className="rounded-lg border overflow-x-auto bg-muted/5">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b bg-muted/20 font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="p-3">Vehicle</th>
                    <th className="p-3">Type</th>
                    <th className="p-3 font-mono">Distance</th>
                    <th className="p-3 font-mono">Fuel Cost</th>
                    <th className="p-3 font-mono">Maint. Cost</th>
                    <th className="p-3 font-mono">Total Revenue</th>
                    <th className="p-3 font-mono">Total Ops Cost</th>
                    <th className="p-3 font-mono text-right">ROI (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {computedReports.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="p-8 text-center text-muted-foreground"
                      >
                        No operational reports available for the selected
                        filters.
                      </td>
                    </tr>
                  ) : (
                    computedReports.map((row) => (
                      <tr
                        key={row.vehicle_id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-3 font-semibold">
                          {row.name_model}{" "}
                          <span className="text-[10px] text-muted-foreground font-normal">
                            ({row.registration_number})
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {row.type}
                        </td>
                        <td className="p-3 font-mono text-muted-foreground">
                          {row.total_distance.toLocaleString()} km
                        </td>
                        <td className="p-3 font-mono text-muted-foreground">
                          ${row.total_fuel_cost.toLocaleString()}
                        </td>
                        <td className="p-3 font-mono text-muted-foreground">
                          ${row.total_maintenance_cost.toLocaleString()}
                        </td>
                        <td className="p-3 font-mono text-muted-foreground">
                          ${row.total_revenue.toLocaleString()}
                        </td>
                        <td className="p-3 font-mono font-medium">
                          ${row.total_operational_cost.toLocaleString()}
                        </td>
                        <td
                          className={`p-3 font-mono font-bold text-right ${row.roi >= 0 ? "text-emerald-500" : "text-red-500"}`}
                        >
                          {(row.roi * 100).toFixed(4)}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
