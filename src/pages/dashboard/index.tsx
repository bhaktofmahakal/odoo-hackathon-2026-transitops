import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { DashboardKPIs, Trip, Vehicle } from "@/lib/types";
import { KPICards } from "./kpi-cards";
import { RecentTrips } from "./recent-trips";
import { VehicleStatusChart } from "./vehicle-status-chart";
import { CardSkeleton } from "@/components/ui/loading-skeleton";

export default function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [vehicleStatusCounts, setVehicleStatusCounts] = useState<
    Record<string, number>
  >({});
  const [loading, setLoading] = useState(true);

  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");

  const [allVehicles, setAllVehicles] = useState<any[]>([]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);

    const hasFilters =
      typeFilter !== "all" || statusFilter !== "all" || regionFilter !== "all";

    if (!hasFilters) {
      // Unfiltered: use the view (fast, server-side)
      const { data: kpiData } = await supabase
        .from("v_dashboard_kpis")
        .select("*")
        .single();

      if (kpiData) {
        setKpis(kpiData as DashboardKPIs);

        // Also fetch raw vehicles for filter dropdowns + chart
        const { data: vehData } = await supabase
          .from("vehicles")
          .select("status, type, region");
        const v = vehData || [];
        setAllVehicles(v);

        const counts: Record<string, number> = {};
        v.forEach((ve: any) => {
          counts[ve.status] = (counts[ve.status] || 0) + 1;
        });
        setVehicleStatusCounts(counts);

        // Recent trips unfiltered
        const { data: tripData } = await supabase
          .from("trips")
          .select("*, vehicles(registration_number, name_model), drivers(name)")
          .order("created_at", { ascending: false })
          .limit(5);
        if (tripData) setRecentTrips(tripData as Trip[]);

        setLoading(false);
        return;
      }
    }

    // Filtered path: query raw tables with filters
    // 1. Fetch vehicles (with type/region filters)
    let vehicleQuery = supabase.from("vehicles").select("id, status, type, region");
    if (typeFilter !== "all") vehicleQuery = vehicleQuery.eq("type", typeFilter);
    if (regionFilter !== "all") vehicleQuery = vehicleQuery.eq("region", regionFilter);
    // Status filter on vehicles: if user picked a vehicle status, filter here
    // But we also need to show KPIs like "trips_active" which aren't vehicle-status-based
    // So we fetch all vehicles matching type/region, then apply status filter to KPIs separately

    const { data: vehData } = await vehicleQuery;
    const vehicles = (vehData || []) as any[];
    setAllVehicles(vehicles);

    // Apply vehicle status filter for vehicle-related KPIs
    const filteredVehicles =
      statusFilter !== "all"
        ? vehicles.filter((v) => v.status === statusFilter)
        : vehicles;

    // 2. Fetch trips (filtered by vehicle ids if type/region filters active)
    let tripQuery = supabase
      .from("trips")
      .select("*, vehicles(registration_number, name_model, type, region), drivers(name)")
      .order("created_at", { ascending: false })
      .limit(5);

    // For KPIs, we need ALL matching trips (not just 5), so count separately
    let tripCountQuery = supabase.from("trips").select("status, vehicle_id");
    if (vehicles.length > 0) {
      const vehicleIds = vehicles.map((v) => v.id);
      tripQuery = tripQuery.in("vehicle_id", vehicleIds);
      tripCountQuery = tripCountQuery.in("vehicle_id", vehicleIds);
    }

    const [tripResult, tripCountResult, driverResult] = await Promise.all([
      tripQuery,
      tripCountQuery,
      supabase.from("drivers").select("status"),
    ]);

    const tripRows = (tripCountResult.data || []) as any[];
    const driverRows = (driverResult.data || []) as any[];

    // 3. Compute KPIs from filtered data
    const activeFleet = filteredVehicles.filter((v) => v.status !== "Retired").length;
    const busyFleet = filteredVehicles.filter((v) => v.status === "On Trip").length;

    setKpis({
      vehicles_available: filteredVehicles.filter((v) => v.status === "Available").length,
      vehicles_active: activeFleet,
      vehicles_in_maintenance: filteredVehicles.filter((v) => v.status === "In Shop").length,
      trips_active: tripRows.filter((t) => t.status === "Dispatched").length,
      trips_pending: tripRows.filter((t) => t.status === "Draft").length,
      drivers_on_duty: driverRows.filter((d) => d.status === "On Trip").length,
      fleet_utilization_pct:
        activeFleet > 0
          ? Number(((busyFleet / activeFleet) * 100).toFixed(1))
          : 0,
    });

    // 4. Vehicle status chart (filtered vehicles)
    const counts: Record<string, number> = {};
    filteredVehicles.forEach((v) => {
      counts[v.status] = (counts[v.status] || 0) + 1;
    });
    setVehicleStatusCounts(counts);

    // 5. Recent trips (filtered by vehicle ids)
    if (tripResult.data) setRecentTrips(tripResult.data as Trip[]);

    setLoading(false);
  }, [typeFilter, statusFilter, regionFilter]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const typesList = useMemo(
    () => Array.from(new Set(allVehicles.map((v: any) => v.type).filter(Boolean))) as string[],
    [allVehicles],
  );
  const regionsList = useMemo(
    () => Array.from(new Set(allVehicles.map((v: any) => v.region).filter(Boolean))) as string[],
    [allVehicles],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Filters
        </span>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-8 rounded-md border border-input bg-transparent px-2 sm:px-3 text-xs sm:text-sm"
        >
          <option value="all">Type: All</option>
          {typesList.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 rounded-md border border-input bg-transparent px-2 sm:px-3 text-xs sm:text-sm"
        >
          <option value="all">Status: All</option>
          <option value="Available">Available</option>
          <option value="On Trip">On Trip</option>
          <option value="In Shop">In Shop</option>
          <option value="Retired">Retired</option>
        </select>
        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          className="h-8 rounded-md border border-input bg-transparent px-2 sm:px-3 text-xs sm:text-sm"
        >
          <option value="all">Region: All</option>
          {regionsList.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        kpis && <KPICards kpis={kpis} />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RecentTrips trips={recentTrips} loading={loading} />
        </div>
        <div className="lg:col-span-2">
          <VehicleStatusChart counts={vehicleStatusCounts} loading={loading} />
        </div>
      </div>
    </div>
  );
}
