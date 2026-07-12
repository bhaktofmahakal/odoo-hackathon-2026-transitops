// ============================================================
// TypeScript types matching transitops_schema.sql
// ============================================================

// ---------- ENUMS ----------

export type UserRole = 'fleet_manager' | 'driver' | 'safety_officer' | 'financial_analyst';

export type VehicleStatus = 'Available' | 'On Trip' | 'In Shop' | 'Retired';

export type DriverStatus = 'Available' | 'On Trip' | 'Off Duty' | 'Suspended';

export type TripStatus = 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled';

export type MaintenanceStatus = 'Active' | 'Closed';

// ---------- TABLE TYPES ----------

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  region: string | null;
  created_at: string;
}

export interface Vehicle {
  id: string;
  registration_number: string;
  name_model: string;
  type: string;
  max_load_capacity: number;
  odometer: number;
  acquisition_cost: number;
  region: string | null;
  status: VehicleStatus;
  document_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  profile_id: string | null;
  name: string;
  license_number: string;
  license_category: string;
  license_expiry_date: string;
  contact_number: string | null;
  safety_score: number;
  status: DriverStatus;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: string;
  source: string;
  destination: string;
  vehicle_id: string;
  driver_id: string;
  cargo_weight: number;
  planned_distance: number;
  final_odometer: number | null;
  fuel_consumed: number | null;
  revenue: number;
  status: TripStatus;
  dispatched_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_by: string | null;
  created_at: string;
  // Joined fields (optional, for display)
  vehicles?: Pick<Vehicle, 'registration_number' | 'name_model'>;
  drivers?: Pick<Driver, 'name'>;
}

export interface MaintenanceLog {
  id: string;
  vehicle_id: string;
  description: string;
  cost: number;
  status: MaintenanceStatus;
  opened_at: string;
  closed_at: string | null;
  // Joined fields
  vehicles?: Pick<Vehicle, 'registration_number' | 'name_model'>;
}

export interface FuelLog {
  id: string;
  vehicle_id: string;
  trip_id: string | null;
  liters: number;
  cost: number;
  log_date: string;
  created_at: string;
  // Joined fields
  vehicles?: Pick<Vehicle, 'registration_number' | 'name_model'>;
}

export interface Expense {
  id: string;
  vehicle_id: string;
  trip_id: string | null;
  category: string;
  amount: number;
  expense_date: string;
  created_at: string;
  // Joined fields
  vehicles?: Pick<Vehicle, 'registration_number' | 'name_model'>;
}

export interface Notification {
  id: string;
  recipient_id: string | null;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// ---------- VIEW TYPES ----------

export interface DashboardKPIs {
  vehicles_available: number;
  vehicles_active: number;
  vehicles_in_maintenance: number;
  trips_active: number;
  trips_pending: number;
  drivers_on_duty: number;
  fleet_utilization_pct: number | null;
}

export interface VehicleReport {
  vehicle_id: string;
  registration_number: string;
  name_model: string;
  acquisition_cost: number;
  total_maintenance_cost: number;
  total_fuel_cost: number;
  total_fuel_liters: number;
  total_distance: number;
  total_revenue: number;
  total_operational_cost: number;
  fuel_efficiency: number;
  roi: number;
}
