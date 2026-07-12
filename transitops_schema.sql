-- ============================================================
-- TransitOps — Full Supabase Schema (Idempotent)
-- Covers: Auth/RBAC, Vehicles, Drivers, Trips, Maintenance,
-- Fuel/Expenses, Reports, Documents, Notifications/Reminders
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS throughout
-- ============================================================

-- ---------- ENUMS ----------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('fleet_manager', 'driver', 'safety_officer', 'financial_analyst');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE vehicle_status AS ENUM ('Available', 'On Trip', 'In Shop', 'Retired');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE driver_status AS ENUM ('Available', 'On Trip', 'Off Duty', 'Suspended');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE trip_status AS ENUM ('Draft', 'Dispatched', 'Completed', 'Cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE maintenance_status AS ENUM ('In Shop', 'Completed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ---------- PROFILES (extends auth.users) ----------
CREATE TABLE IF NOT EXISTS profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role user_role not null default 'driver',
  region text,
  created_at timestamptz default now()
);

-- ---------- VEHICLES ----------
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid primary key default gen_random_uuid(),
  registration_number text unique not null,
  name_model text not null,
  type text not null,
  max_load_capacity numeric not null,
  odometer numeric default 0,
  acquisition_cost numeric not null,
  region text,
  status vehicle_status not null default 'Available',
  document_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- DRIVERS ----------
CREATE TABLE IF NOT EXISTS drivers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  name text not null,
  license_number text unique not null,
  license_category text not null,
  license_expiry_date date not null,
  contact_number text,
  safety_score numeric default 100,
  status driver_status not null default 'Available',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- TRIPS ----------
CREATE TABLE IF NOT EXISTS trips (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  destination text not null,
  vehicle_id uuid not null references vehicles(id),
  driver_id uuid not null references drivers(id),
  cargo_weight numeric not null,
  planned_distance numeric not null,
  final_odometer numeric,
  fuel_consumed numeric,
  revenue numeric default 0,
  status trip_status not null default 'Draft',
  dispatched_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ---------- MAINTENANCE LOGS ----------
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id),
  description text not null,
  cost numeric default 0,
  status maintenance_status not null default 'In Shop',
  opened_at timestamptz default now(),
  closed_at timestamptz
);

-- ---------- FUEL LOGS ----------
CREATE TABLE IF NOT EXISTS fuel_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id),
  trip_id uuid references trips(id),
  liters numeric not null,
  cost numeric not null,
  log_date date not null default current_date,
  created_at timestamptz default now()
);

-- ---------- EXPENSES (tolls, misc) ----------
CREATE TABLE IF NOT EXISTS expenses (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id),
  trip_id uuid references trips(id),
  category text not null,
  amount numeric not null,
  expense_date date not null default current_date,
  created_at timestamptz default now()
);

-- ---------- NOTIFICATIONS (bonus: email/license reminders) ----------
CREATE TABLE IF NOT EXISTS notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references profiles(id),
  type text not null,
  message text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- AUTO STATUS-CASCADE TRIGGERS (core business rules)
-- ============================================================

-- 1. Trip status cascade: Dispatch/Complete/Cancel → vehicle & driver status
DROP TRIGGER IF EXISTS trg_1_trip_status_cascade ON trips;
CREATE OR REPLACE FUNCTION fn_trip_status_cascade()
RETURNS trigger AS $$
BEGIN
  -- Handle INSERT with status = 'Dispatched' (direct dispatch)
  IF TG_OP = 'INSERT' AND NEW.status = 'Dispatched' THEN
    UPDATE vehicles SET status = 'On Trip', updated_at = now() WHERE id = NEW.vehicle_id;
    UPDATE drivers SET status = 'On Trip', updated_at = now() WHERE id = NEW.driver_id;
    NEW.dispatched_at = coalesce(NEW.dispatched_at, now());

    INSERT INTO notifications (recipient_id, type, message)
    SELECT NEW.created_by, 'trip_dispatched', 'Trip dispatched: ' || NEW.source || ' -> ' || NEW.destination
    WHERE NEW.created_by IS NOT NULL;

  -- Handle UPDATE transitions
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'Dispatched' AND OLD.status = 'Draft' THEN
      UPDATE vehicles SET status = 'On Trip', updated_at = now() WHERE id = NEW.vehicle_id;
      UPDATE drivers SET status = 'On Trip', updated_at = now() WHERE id = NEW.driver_id;
      NEW.dispatched_at = now();

      INSERT INTO notifications (recipient_id, type, message)
      SELECT NEW.created_by, 'trip_dispatched', 'Trip dispatched: ' || NEW.source || ' -> ' || NEW.destination
      WHERE NEW.created_by IS NOT NULL;

    ELSIF NEW.status = 'Completed' AND OLD.status = 'Dispatched' THEN
      UPDATE vehicles SET status = 'Available', odometer = coalesce(NEW.final_odometer, odometer), updated_at = now()
        WHERE id = NEW.vehicle_id;
      UPDATE drivers SET status = 'Available', updated_at = now() WHERE id = NEW.driver_id;
      NEW.completed_at = now();

    ELSIF NEW.status = 'Cancelled' AND OLD.status = 'Dispatched' THEN
      UPDATE vehicles SET status = 'Available', updated_at = now() WHERE id = NEW.vehicle_id;
      UPDATE drivers SET status = 'Available', updated_at = now() WHERE id = NEW.driver_id;
      NEW.cancelled_at = now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_1_trip_status_cascade
BEFORE INSERT OR UPDATE ON trips
FOR EACH ROW
EXECUTE FUNCTION fn_trip_status_cascade();

-- 2. Trip validation: capacity, availability, license
DROP TRIGGER IF EXISTS trg_0_trip_validate ON trips;
CREATE OR REPLACE FUNCTION fn_trip_validate()
RETURNS trigger AS $$
DECLARE
  v_status vehicle_status;
  v_capacity numeric;
  d_status driver_status;
  d_expiry date;
BEGIN
  SELECT status, max_load_capacity INTO v_status, v_capacity FROM vehicles WHERE id = NEW.vehicle_id;
  SELECT status, license_expiry_date INTO d_status, d_expiry FROM drivers WHERE id = NEW.driver_id;

  IF NEW.status = 'Dispatched' AND (OLD IS NULL OR OLD.status = 'Draft') THEN
    IF v_status NOT IN ('Available') THEN
      RAISE EXCEPTION 'Vehicle is not available for dispatch (current status: %)', v_status;
    END IF;
    IF d_status NOT IN ('Available') THEN
      RAISE EXCEPTION 'Driver is not available for dispatch (current status: %)', d_status;
    END IF;
    IF d_expiry < current_date THEN
      RAISE EXCEPTION 'Driver license has expired';
    END IF;
    IF NEW.cargo_weight > v_capacity THEN
      RAISE EXCEPTION 'Cargo weight (%) exceeds vehicle max capacity (%)', NEW.cargo_weight, v_capacity;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_0_trip_validate
BEFORE INSERT OR UPDATE ON trips
FOR EACH ROW
EXECUTE FUNCTION fn_trip_validate();

-- 3. Maintenance cascade: In Shop → vehicle status; Completed → vehicle Available + expense
DROP TRIGGER IF EXISTS trg_maintenance_status_cascade ON maintenance_logs;
CREATE OR REPLACE FUNCTION fn_maintenance_status_cascade()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'In Shop' THEN
    UPDATE vehicles SET status = 'In Shop', updated_at = now() WHERE id = NEW.vehicle_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'Completed' AND OLD.status = 'In Shop' THEN
    NEW.closed_at = now();
    UPDATE vehicles SET status = 'Available', updated_at = now()
      WHERE id = NEW.vehicle_id AND status <> 'Retired';

    -- auto-log maintenance cost as an expense
    INSERT INTO expenses (vehicle_id, category, amount, expense_date)
    VALUES (NEW.vehicle_id, 'maintenance', NEW.cost, current_date);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_maintenance_status_cascade
BEFORE INSERT OR UPDATE ON maintenance_logs
FOR EACH ROW
EXECUTE FUNCTION fn_maintenance_status_cascade();

-- 4. Prevent double-booking a vehicle or driver
DROP TRIGGER IF EXISTS trg_prevent_double_active_trip ON trips;
CREATE OR REPLACE FUNCTION fn_prevent_double_active_trip()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'Dispatched' THEN
    IF EXISTS (
      SELECT 1 FROM trips
      WHERE status = 'Dispatched'
        AND id <> NEW.id
        AND (vehicle_id = NEW.vehicle_id OR driver_id = NEW.driver_id)
    ) THEN
      RAISE EXCEPTION 'Vehicle or driver already has an active dispatched trip';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_double_active_trip
BEFORE INSERT OR UPDATE ON trips
FOR EACH ROW
WHEN (NEW.status = 'Dispatched')
EXECUTE FUNCTION fn_prevent_double_active_trip();

-- ============================================================
-- LICENSE EXPIRY REMINDER (bonus feature)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_check_license_expiry()
RETURNS void AS $$
BEGIN
  INSERT INTO notifications (recipient_id, type, message)
  SELECT p.id, 'license_expiry',
         'License for driver ' || d.name || ' expires on ' || d.license_expiry_date
  FROM drivers d
  JOIN profiles p ON p.role = 'safety_officer'
  WHERE d.license_expiry_date <= current_date + interval '7 days'
    AND d.license_expiry_date >= current_date
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.type = 'license_expiry'
        AND n.message LIKE '%' || d.name || '%'
        AND n.created_at::date = current_date
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY (RBAC)
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- helper: get current user's role
CREATE OR REPLACE FUNCTION fn_current_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS profiles_select_all ON profiles;
DROP POLICY IF EXISTS profiles_update_self ON profiles;
DROP POLICY IF EXISTS vehicles_select_all ON vehicles;
DROP POLICY IF EXISTS vehicles_write_fleet_manager ON vehicles;
DROP POLICY IF EXISTS vehicles_update_fleet_manager ON vehicles;
DROP POLICY IF EXISTS drivers_select_all ON drivers;
DROP POLICY IF EXISTS drivers_write ON drivers;
DROP POLICY IF EXISTS drivers_update ON drivers;
DROP POLICY IF EXISTS trips_select_all ON trips;
DROP POLICY IF EXISTS trips_write ON trips;
DROP POLICY IF EXISTS trips_update ON trips;
DROP POLICY IF EXISTS maintenance_select_all ON maintenance_logs;
DROP POLICY IF EXISTS maintenance_write ON maintenance_logs;
DROP POLICY IF EXISTS maintenance_update ON maintenance_logs;
DROP POLICY IF EXISTS fuel_select_all ON fuel_logs;
DROP POLICY IF EXISTS fuel_write ON fuel_logs;
DROP POLICY IF EXISTS expenses_select_all ON expenses;
DROP POLICY IF EXISTS expenses_write ON expenses;
DROP POLICY IF EXISTS notifications_select_own ON notifications;
DROP POLICY IF EXISTS notifications_update_own ON notifications;

-- profiles
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_self" ON profiles FOR UPDATE USING (auth.uid() = id);

-- vehicles
CREATE POLICY "vehicles_select_all" ON vehicles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "vehicles_write_fleet_manager" ON vehicles FOR INSERT WITH CHECK (fn_current_role() = 'fleet_manager');
CREATE POLICY "vehicles_update_fleet_manager" ON vehicles FOR UPDATE USING (fn_current_role() = 'fleet_manager');

-- drivers
CREATE POLICY "drivers_select_all" ON drivers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "drivers_write" ON drivers FOR INSERT WITH CHECK (fn_current_role() IN ('fleet_manager','safety_officer'));
CREATE POLICY "drivers_update" ON drivers FOR UPDATE USING (fn_current_role() IN ('fleet_manager','safety_officer'));

-- trips
CREATE POLICY "trips_select_all" ON trips FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "trips_write" ON trips FOR INSERT WITH CHECK (fn_current_role() IN ('driver','fleet_manager'));
CREATE POLICY "trips_update" ON trips FOR UPDATE USING (fn_current_role() IN ('driver','fleet_manager'));

-- maintenance
CREATE POLICY "maintenance_select_all" ON maintenance_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "maintenance_write" ON maintenance_logs FOR INSERT WITH CHECK (fn_current_role() = 'fleet_manager');
CREATE POLICY "maintenance_update" ON maintenance_logs FOR UPDATE USING (fn_current_role() = 'fleet_manager');

-- fuel/expenses
CREATE POLICY "fuel_select_all" ON fuel_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "fuel_write" ON fuel_logs FOR INSERT WITH CHECK (fn_current_role() IN ('fleet_manager','driver'));

CREATE POLICY "expenses_select_all" ON expenses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "expenses_write" ON expenses FOR INSERT WITH CHECK (fn_current_role() IN ('fleet_manager','driver'));

-- notifications: user sees only their own; service role can insert
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "notifications_insert_service" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE USING (auth.uid() = recipient_id);

-- ============================================================
-- VIEWS for Reports & Dashboard
-- ============================================================

CREATE OR REPLACE VIEW v_dashboard_kpis AS
SELECT
  (SELECT count(*) FROM vehicles WHERE status = 'Available') AS vehicles_available,
  (SELECT count(*) FROM vehicles WHERE status != 'Retired') AS vehicles_active,
  (SELECT count(*) FROM vehicles WHERE status = 'In Shop') AS vehicles_in_maintenance,
  (SELECT count(*) FROM trips WHERE status = 'Dispatched') AS trips_active,
  (SELECT count(*) FROM trips WHERE status = 'Draft') AS trips_pending,
  (SELECT count(*) FROM drivers WHERE status = 'On Trip') AS drivers_on_duty,
  round(
    (SELECT count(*)::numeric FROM vehicles WHERE status = 'On Trip') /
    nullif((SELECT count(*)::numeric FROM vehicles WHERE status != 'Retired'), 0) * 100, 1
  ) AS fleet_utilization_pct;

CREATE OR REPLACE VIEW v_vehicle_report AS
SELECT
  v.id AS vehicle_id,
  v.registration_number,
  v.name_model,
  v.acquisition_cost,
  coalesce(sum(DISTINCT m.cost), 0) AS total_maintenance_cost,
  coalesce(sum(DISTINCT f.cost), 0) AS total_fuel_cost,
  coalesce(sum(DISTINCT f.liters), 0) AS total_fuel_liters,
  coalesce(sum(DISTINCT t.planned_distance) FILTER (WHERE t.status = 'Completed'), 0) AS total_distance,
  coalesce(sum(DISTINCT t.revenue) FILTER (WHERE t.status = 'Completed'), 0) AS total_revenue,
  (coalesce(sum(DISTINCT m.cost), 0) + coalesce(sum(DISTINCT f.cost), 0)) AS total_operational_cost,
  CASE WHEN coalesce(sum(DISTINCT f.liters), 0) > 0
    THEN round(coalesce(sum(DISTINCT t.planned_distance) FILTER (WHERE t.status = 'Completed'), 0) / sum(DISTINCT f.liters), 2)
    ELSE 0
  END AS fuel_efficiency,
  CASE WHEN v.acquisition_cost > 0
    THEN round(
      (coalesce(sum(DISTINCT t.revenue) FILTER (WHERE t.status = 'Completed'), 0)
       - (coalesce(sum(DISTINCT m.cost), 0) + coalesce(sum(DISTINCT f.cost), 0)))
      / v.acquisition_cost, 4)
    ELSE 0
  END AS roi
FROM vehicles v
LEFT JOIN maintenance_logs m ON m.vehicle_id = v.id
LEFT JOIN fuel_logs f ON f.vehicle_id = v.id
LEFT JOIN trips t ON t.vehicle_id = v.id
GROUP BY v.id;

-- ============================================================
-- SEED: create your first fleet_manager after signup manually via:
-- UPDATE profiles SET role = 'fleet_manager' WHERE email = 'you@example.com';
-- ============================================================
