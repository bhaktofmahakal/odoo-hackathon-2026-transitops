import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Vehicle, Trip, MaintenanceLog, FuelLog, Expense, VehicleReport } from '@/lib/types';
import { toast } from 'sonner';

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
        <div className="text-xs text-muted-foreground">Data loaded successfully.</div>
      )}
    </div>
  );
}
