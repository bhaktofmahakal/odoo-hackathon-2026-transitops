import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { DashboardKPIs, Trip } from "@/lib/types";
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

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);

      const { data: kpiData } = await supabase
        .from("v_dashboard_kpis")
        .select("*")
        .single();

      if (kpiData) {
        setKpis(kpiData as DashboardKPIs);
        setLoading(false);
        return;
      }

      const [veh, trp, drv] = await Promise.all([
        supabase.from("vehicles").select("status, type, region"),
        supabase.from("trips").select("status").limit(1000),
        supabase.from("drivers").select("status"),
      ]);

      const v = veh.data || [];
      const t = trp.data || [];
      const d = drv.data || [];

      setAllVehicles(v);

      setKpis({
        vehicles_available: v.filter((x: any) => x.status === "Available").length,
        vehicles_active: v.filter((x: any) => x.status !== "Retired").length,
        vehicles_in_maintenance: v.filter((x: any) => x.status === "In Shop").length,
        trips_active: t.filter((x: any) => x.status === "Dispatched").length,
        trips_pending: t.filter((x: any) => x.status === "Draft").length,
        drivers_on_duty: d.filter((x: any) => x.status === "On Trip").length,
        fleet_utilization_pct:
          v.filter((x: any) => x.status !== "Retired").length > 0
            ? Number(
                (
                  (v.filter((x: any) => x.status === "On Trip").length /
                    v.filter((x: any) => x.status !== "Retired").length) *
                  100
                ).toFixed(1),
              )
            : 0,
      });

      const counts: Record<string, number> = {};
      v.forEach((ve: any) => {
        counts[ve.status] = (counts[ve.status] || 0) + 1;
      });
      setVehicleStatusCounts(counts);

      // Fetch recent trips
      const { data: tripData } = await supabase
        .from("trips")
        .select("*, vehicles(registration_number, name_model), drivers(name)")
        .order("created_at", { ascending: false })
        .limit(5);

      if (tripData) setRecentTrips(tripData as Trip[]);

      setLoading(false);
    }

    fetchDashboardData();
  }, []);

  const typesList = useMemo(
    () => Array.from(new Set(allVehicles.map((v: any) => v.type).filter(Boolean))) as string[],
    [allVehicles],
  );
  const regionsList = useMemo(
    () => Array.from(new Set(allVehicles.map((v: any) => v.region).filter(Boolean))) as string[],
    [allVehicles],
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Filters
        </span>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-8 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="all">Vehicle Type: All</option>
          {typesList.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 rounded-md border border-input bg-transparent px-3 text-sm"
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
          className="h-8 rounded-md border border-input bg-transparent px-3 text-sm"
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
