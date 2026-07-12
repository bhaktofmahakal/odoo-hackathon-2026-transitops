import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { DashboardKPIs, Trip } from '@/lib/types';
import { KPICards } from './kpi-cards';
import { RecentTrips } from './recent-trips';
import { VehicleStatusChart } from './vehicle-status-chart';
import { CardSkeleton } from '@/components/ui/loading-skeleton';

export default function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [vehicleStatusCounts, setVehicleStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);

      // Fetch KPIs from view
      const { data: kpiData } = await supabase
        .from('v_dashboard_kpis')
        .select('*')
        .single();

      if (kpiData) setKpis(kpiData as DashboardKPIs);

      // Fetch recent trips with vehicle/driver info
      const { data: tripData } = await supabase
        .from('trips')
        .select('*, vehicles(registration_number, name_model), drivers(name)')
        .order('created_at', { ascending: false })
        .limit(5);

      if (tripData) setRecentTrips(tripData as Trip[]);

      // Fetch vehicle status distribution
      const { data: vehicleData } = await supabase
        .from('vehicles')
        .select('status');

      if (vehicleData) {
        const counts: Record<string, number> = {};
        vehicleData.forEach((v) => {
          counts[v.status] = (counts[v.status] || 0) + 1;
        });
        setVehicleStatusCounts(counts);
      }

      setLoading(false);
    }

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6 p-6">
      {/* Filters row — matching mockup */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Filters</span>
        {/* TODO: Wire filter functionality when data views are ready */}
        <select className="h-8 rounded-md border border-input bg-transparent px-3 text-sm">
          <option>Vehicle Type: All</option>
        </select>
        <select className="h-8 rounded-md border border-input bg-transparent px-3 text-sm">
          <option>Status: All</option>
        </select>
        <select className="h-8 rounded-md border border-input bg-transparent px-3 text-sm">
          <option>Region: All</option>
        </select>
      </div>

      {/* KPI Cards Row */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        kpis && <KPICards kpis={kpis} />
      )}

      {/* Bottom section: Recent Trips + Vehicle Status Chart */}
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
