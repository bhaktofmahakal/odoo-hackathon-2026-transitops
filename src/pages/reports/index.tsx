import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Vehicle, Trip, MaintenanceLog, FuelLog, Expense, VehicleReport } from '@/lib/types';
import { toast } from 'sonner';
import {
  Calendar,
  MapPin,
  Truck,
  TrendingUp,
  Fuel,
  Wrench,
  DollarSign,
  Receipt,
  FileDown,
  Gauge,
} from 'lucide-react';
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
} from 'recharts';

export default function ReportsPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [allTimeReport, setAllTimeReport] = useState<VehicleReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { data: vehiclesData },
        { data: tripsData },
        { data: maintData },
        { data: fuelData },
        { data: expData },
        { data: viewData },
      ] = await Promise.all([
        supabase.from('vehicles').select('*'),
        supabase.from('trips').select('*'),
        supabase.from('maintenance_logs').select('*'),
        supabase.from('fuel_logs').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('v_vehicle_report').select('*'),
      ]);

      if (vehiclesData) setVehicles(vehiclesData as Vehicle[]);
      if (tripsData) setTrips(tripsData as Trip[]);
      if (maintData) setMaintenanceLogs(maintData as MaintenanceLog[]);
      if (fuelData) setFuelLogs(fuelData as FuelLog[]);
      if (expData) setExpenses(expData as Expense[]);
      if (viewData) setAllTimeReport(viewData as VehicleReport[]);
    } catch (err: any) {
      toast.error('Failed to load reporting data', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const computedReports = useMemo(() => {
    return vehicles
      .filter((v) => {
        const matchesType = selectedType === 'all' || v.type === selectedType;
        const matchesRegion =
          selectedRegion === 'all' ||
          (selectedRegion === 'empty' && !v.region) ||
          v.region === selectedRegion;
        return matchesType && matchesRegion;
      })
      .map((v) => {
        // Filter trips for this vehicle within date range
        const vehicleTrips = trips.filter((t) => {
          if (t.vehicle_id !== v.id || t.status !== 'Completed') return false;
          if (startDate && new Date(t.completed_at || t.created_at) < new Date(startDate)) return false;
          if (endDate && new Date(t.completed_at || t.created_at) > new Date(endDate + 'T23:59:59')) return false;
          return true;
        });

        // Filter fuel logs for this vehicle within date range
        const vehicleFuel = fuelLogs.filter((f) => {
          if (f.vehicle_id !== v.id) return false;
          if (startDate && new Date(f.log_date) < new Date(startDate)) return false;
          if (endDate && new Date(f.log_date) > new Date(endDate)) return false;
          return true;
        });

        // Filter maintenance logs for this vehicle within date range
        const vehicleMaint = maintenanceLogs.filter((m) => {
          if (m.vehicle_id !== v.id) return false;
          if (startDate && new Date(m.opened_at) < new Date(startDate)) return false;
          if (endDate && new Date(m.opened_at) > new Date(endDate + 'T23:59:59')) return false;
          return true;
        });

        const totalDistance = vehicleTrips.reduce((sum, t) => sum + Number(t.planned_distance), 0);
        const totalRevenue = vehicleTrips.reduce((sum, t) => sum + Number(t.revenue || 0), 0);
        const totalFuelCost = vehicleFuel.reduce((sum, f) => sum + Number(f.cost), 0);
        const totalFuelLiters = vehicleFuel.reduce((sum, f) => sum + Number(f.liters), 0);
        const totalMaintenanceCost = vehicleMaint.reduce((sum, m) => sum + Number(m.cost || 0), 0);

        const totalOperationalCost = totalFuelCost + totalMaintenanceCost;
        const fuelEfficiency = totalFuelLiters > 0 ? Number((totalDistance / totalFuelLiters).toFixed(2)) : 0;
        
        const netProfit = totalRevenue - totalOperationalCost;
        const roi = v.acquisition_cost > 0 ? Number((netProfit / v.acquisition_cost).toFixed(5)) : 0;

        return {
          vehicle_id: v.id,
          registration_number: v.registration_number,
          name_model: v.name_model,
          type: v.type,
          region: v.region,
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
  }, [vehicles, trips, maintenanceLogs, fuelLogs, startDate, endDate, selectedType, selectedRegion]);

  // Extract unique types and regions for filters
  const typesList = useMemo(() => {
    return Array.from(new Set(vehicles.map((v) => v.type).filter(Boolean))) as string[];
  }, [vehicles]);

  const regionsList = useMemo(() => {
    return Array.from(new Set(vehicles.map((v) => v.region).filter(Boolean))) as string[];
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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports & Fleet Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Analyze fuel efficiency, ROI index, and aggregate operational expenses.
        </p>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading analytics dashboard...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-card border rounded-xl p-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Calendar className="size-3" />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Calendar className="size-3" />
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Truck className="size-3" />
                Vehicle Type
              </label>
              <select
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
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <MapPin className="size-3" />
                Region
              </label>
              <div className="flex gap-2">
                <select
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

                {(startDate || endDate || selectedType !== 'all' || selectedRegion !== 'all') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                      setSelectedType('all');
                      setSelectedRegion('all');
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
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Fleet</p>
                <p className="text-xl font-bold font-mono">
                  {vehicles.filter((v) => v.status !== 'Retired').length}
                </p>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
                <Gauge className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fleet Utilization</p>
                <p className="text-xl font-bold font-mono">
                  {(() => {
                    const active = vehicles.filter((v) => v.status !== 'Retired').length;
                    const busy = vehicles.filter((v) => v.status === 'On Trip').length;
                    return active > 0 ? ((busy / active) * 100).toFixed(1) : '0.0';
                  })()}%
                </p>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <DollarSign className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Ops Cost</p>
                <p className="text-xl font-bold font-mono">
                  ${computedReports.reduce((sum, r) => sum + r.total_operational_cost, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                <TrendingUp className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg ROI Index</p>
                <p className="text-xl font-bold font-mono">
                  {(() => {
                    const valid = computedReports.filter((r) => r.acquisition_cost > 0);
                    const avg = valid.length > 0 ? valid.reduce((sum, r) => sum + r.roi, 0) / valid.length : 0;
                    return (avg * 100).toFixed(4);
                  })()}%
                </p>
              </div>
            </div>
          </div>

          {/* Fuel Efficiency Chart */}
          <div className="grid grid-cols-1 gap-6">
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold leading-none">Fuel Efficiency Ranking</h3>
                  <p className="text-xs text-muted-foreground mt-1">Average kilometers traveled per liter of fuel (higher is better).</p>
                </div>
              </div>

              {fuelEfficiencyData.length === 0 ? (
                <div className="h-64 flex items-center justify-center border border-dashed rounded-lg bg-muted/10 text-xs text-muted-foreground">
                  No fuel refill data available for the selected range.
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fuelEfficiencyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" fontSize={11} stroke="#888888" tickLine={false} />
                      <YAxis fontSize={11} stroke="#888888" unit=" km/L" tickLine={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-lg border bg-background p-2.5 shadow-md text-xs space-y-1">
                                <p className="font-semibold">{payload[0].payload.fullName}</p>
                                <p className="text-amber-500 font-mono">
                                  Efficiency: <span className="font-bold">{payload[0].value}</span> km/L
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="efficiency" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                        {fuelEfficiencyData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#f59e0b'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
