import { useEffect, useState } from 'react';
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
