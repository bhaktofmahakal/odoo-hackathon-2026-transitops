-- ============================================================
-- TransitOps — Full Supabase Schema
-- Covers: Auth/RBAC, Vehicles, Drivers, Trips, Maintenance,
-- Fuel/Expenses, Reports, Documents, Notifications/Reminders
-- ============================================================

-- ---------- ENUMS ----------
create type user_role as enum ('fleet_manager', 'driver', 'safety_officer', 'financial_analyst');
create type vehicle_status as enum ('Available', 'On Trip', 'In Shop', 'Retired');
create type driver_status as enum ('Available', 'On Trip', 'Off Duty', 'Suspended');
create type trip_status as enum ('Draft', 'Dispatched', 'Completed', 'Cancelled');
create type maintenance_status as enum ('Active', 'Closed');

-- ---------- PROFILES (extends auth.users) ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role user_role not null default 'driver',
  region text,
  created_at timestamptz default now()
);

-- ---------- VEHICLES ----------
create table vehicles (
  id uuid primary key default gen_random_uuid(),
  registration_number text unique not null,
  name_model text not null,
  type text not null,               -- Truck, Van, Bike, etc.
  max_load_capacity numeric not null,
  odometer numeric default 0,
  acquisition_cost numeric not null,
  region text,
  status vehicle_status not null default 'Available',
  document_url text,                -- Supabase storage link (bonus: doc management)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- DRIVERS ----------
create table drivers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),  -- link to auth user if driver logs in
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
create table trips (
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
create table maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id),
  description text not null,
  cost numeric default 0,
  status maintenance_status not null default 'Active',
  opened_at timestamptz default now(),
  closed_at timestamptz
);

-- ---------- FUEL LOGS ----------
create table fuel_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id),
  trip_id uuid references trips(id),
  liters numeric not null,
  cost numeric not null,
  log_date date not null default current_date,
  created_at timestamptz default now()
);

-- ---------- EXPENSES (tolls, misc) ----------
create table expenses (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id),
  trip_id uuid references trips(id),
  category text not null,   -- toll, misc, maintenance (auto-linked)
  amount numeric not null,
  expense_date date not null default current_date,
  created_at timestamptz default now()
);

-- ---------- NOTIFICATIONS (bonus: email/license reminders) ----------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references profiles(id),
  type text not null,          -- license_expiry, trip_dispatched, maintenance_due
  message text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- AUTO STATUS-CASCADE TRIGGERS (core business rules)
-- ============================================================

-- 1. Dispatch trip -> vehicle & driver = On Trip
-- 2. Complete trip -> vehicle & driver = Available
-- 3. Cancel dispatched trip -> vehicle & driver = Available
create or replace function fn_trip_status_cascade()
returns trigger as $$
begin
  if NEW.status = 'Dispatched' and OLD.status = 'Draft' then
    update vehicles set status = 'On Trip', updated_at = now() where id = NEW.vehicle_id;
    update drivers set status = 'On Trip', updated_at = now() where id = NEW.driver_id;
    NEW.dispatched_at = now();

    insert into notifications (recipient_id, type, message)
    select NEW.created_by, 'trip_dispatched', 'Trip dispatched: ' || NEW.source || ' -> ' || NEW.destination
    where NEW.created_by is not null;

  elsif NEW.status = 'Completed' and OLD.status = 'Dispatched' then
    update vehicles set status = 'Available', odometer = coalesce(NEW.final_odometer, odometer), updated_at = now()
      where id = NEW.vehicle_id;
    update drivers set status = 'Available', updated_at = now() where id = NEW.driver_id;
    NEW.completed_at = now();

  elsif NEW.status = 'Cancelled' and OLD.status = 'Dispatched' then
    update vehicles set status = 'Available', updated_at = now() where id = NEW.vehicle_id;
    update drivers set status = 'Available', updated_at = now() where id = NEW.driver_id;
    NEW.cancelled_at = now();
  end if;

  return NEW;
end;
$$ language plpgsql;

create trigger trg_1_trip_status_cascade
before update on trips
for each row
when (NEW.status is distinct from OLD.status)
execute function fn_trip_status_cascade();

-- 4. Validation before insert/update on trips: capacity, availability, license
create or replace function fn_trip_validate()
returns trigger as $$
declare
  v_status vehicle_status;
  v_capacity numeric;
  d_status driver_status;
  d_expiry date;
begin
  select status, max_load_capacity into v_status, v_capacity from vehicles where id = NEW.vehicle_id;
  select status, license_expiry_date into d_status, d_expiry from drivers where id = NEW.driver_id;

  if NEW.status = 'Dispatched' and (OLD is null or OLD.status = 'Draft') then
    if v_status not in ('Available') then
      raise exception 'Vehicle is not available for dispatch (current status: %)', v_status;
    end if;
    if d_status not in ('Available') then
      raise exception 'Driver is not available for dispatch (current status: %)', d_status;
    end if;
    if d_expiry < current_date then
      raise exception 'Driver license has expired';
    end if;
    if NEW.cargo_weight > v_capacity then
      raise exception 'Cargo weight (%) exceeds vehicle max capacity (%)', NEW.cargo_weight, v_capacity;
    end if;
  end if;

  return NEW;
end;
$$ language plpgsql;

create trigger trg_0_trip_validate
before insert or update on trips
for each row
execute function fn_trip_validate();

-- 5. Maintenance: opening -> vehicle In Shop; closing -> vehicle Available (unless Retired)
create or replace function fn_maintenance_status_cascade()
returns trigger as $$
begin
  if TG_OP = 'INSERT' and NEW.status = 'Active' then
    update vehicles set status = 'In Shop', updated_at = now() where id = NEW.vehicle_id;
  elsif TG_OP = 'UPDATE' and NEW.status = 'Closed' and OLD.status = 'Active' then
    NEW.closed_at = now();
    update vehicles set status = 'Available', updated_at = now()
      where id = NEW.vehicle_id and status <> 'Retired';

    -- auto-log maintenance cost as an expense
    insert into expenses (vehicle_id, category, amount, expense_date)
    values (NEW.vehicle_id, 'maintenance', NEW.cost, current_date);
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_maintenance_status_cascade
before insert or update on maintenance_logs
for each row
execute function fn_maintenance_status_cascade();

-- 6. Prevent registering duplicate active trip for a busy driver/vehicle at Draft stage (extra safety)
create or replace function fn_prevent_double_active_trip()
returns trigger as $$
begin
  if NEW.status = 'Dispatched' then
    if exists (
      select 1 from trips
      where status = 'Dispatched'
        and id <> NEW.id
        and (vehicle_id = NEW.vehicle_id or driver_id = NEW.driver_id)
    ) then
      raise exception 'Vehicle or driver already has an active dispatched trip';
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_prevent_double_active_trip
before update on trips
for each row
when (NEW.status = 'Dispatched')
execute function fn_prevent_double_active_trip();

-- ============================================================
-- LICENSE EXPIRY REMINDER (bonus feature) — run via Supabase
-- scheduled Edge Function / pg_cron daily
-- ============================================================
create or replace function fn_check_license_expiry()
returns void as $$
begin
  insert into notifications (recipient_id, type, message)
  select p.id, 'license_expiry',
         'License for driver ' || d.name || ' expires on ' || d.license_expiry_date
  from drivers d
  join profiles p on p.role = 'safety_officer'
  where d.license_expiry_date <= current_date + interval '7 days'
    and d.license_expiry_date >= current_date
    and not exists (
      select 1 from notifications n
      where n.type = 'license_expiry'
        and n.message like '%' || d.name || '%'
        and n.created_at::date = current_date
    );
end;
$$ language plpgsql;

-- Schedule with pg_cron (enable extension in Supabase dashboard first):
-- select cron.schedule('license-expiry-check', '0 8 * * *', 'select fn_check_license_expiry();');

-- ============================================================
-- ROW LEVEL SECURITY (RBAC)
-- ============================================================
alter table profiles enable row level security;
alter table vehicles enable row level security;
alter table drivers enable row level security;
alter table trips enable row level security;
alter table maintenance_logs enable row level security;
alter table fuel_logs enable row level security;
alter table expenses enable row level security;
alter table notifications enable row level security;

-- helper: get current user's role
create or replace function fn_current_role()
returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql stable;

-- profiles: everyone can read all profiles (needed for dropdowns), only self can update own row
create policy "profiles_select_all" on profiles for select using (true);
create policy "profiles_update_self" on profiles for update using (auth.uid() = id);

-- vehicles: all authenticated roles can read; only fleet_manager can write
create policy "vehicles_select_all" on vehicles for select using (auth.role() = 'authenticated');
create policy "vehicles_write_fleet_manager" on vehicles for insert with check (fn_current_role() = 'fleet_manager');
create policy "vehicles_update_fleet_manager" on vehicles for update using (fn_current_role() = 'fleet_manager');

-- drivers: all can read; fleet_manager + safety_officer can write
create policy "drivers_select_all" on drivers for select using (auth.role() = 'authenticated');
create policy "drivers_write" on drivers for insert with check (fn_current_role() in ('fleet_manager','safety_officer'));
create policy "drivers_update" on drivers for update using (fn_current_role() in ('fleet_manager','safety_officer'));

-- trips: all can read; driver + fleet_manager can create/dispatch
create policy "trips_select_all" on trips for select using (auth.role() = 'authenticated');
create policy "trips_write" on trips for insert with check (fn_current_role() in ('driver','fleet_manager'));
create policy "trips_update" on trips for update using (fn_current_role() in ('driver','fleet_manager'));

-- maintenance: all can read; fleet_manager writes
create policy "maintenance_select_all" on maintenance_logs for select using (auth.role() = 'authenticated');
create policy "maintenance_write" on maintenance_logs for insert with check (fn_current_role() = 'fleet_manager');
create policy "maintenance_update" on maintenance_logs for update using (fn_current_role() = 'fleet_manager');

-- fuel/expenses: all can read; fleet_manager + driver can write; financial_analyst read-only (implicit via select_all)
create policy "fuel_select_all" on fuel_logs for select using (auth.role() = 'authenticated');
create policy "fuel_write" on fuel_logs for insert with check (fn_current_role() in ('fleet_manager','driver'));

create policy "expenses_select_all" on expenses for select using (auth.role() = 'authenticated');
create policy "expenses_write" on expenses for insert with check (fn_current_role() in ('fleet_manager','driver'));

-- notifications: user sees only their own
create policy "notifications_select_own" on notifications for select using (auth.uid() = recipient_id);
create policy "notifications_update_own" on notifications for update using (auth.uid() = recipient_id);

-- ============================================================
-- USEFUL VIEWS for Reports & Dashboard (saves frontend logic)
-- ============================================================

-- Dashboard KPIs
create or replace view v_dashboard_kpis as
select
  (select count(*) from vehicles where status = 'Available') as vehicles_available,
  (select count(*) from vehicles where status != 'Retired') as vehicles_active,
  (select count(*) from vehicles where status = 'In Shop') as vehicles_in_maintenance,
  (select count(*) from trips where status = 'Dispatched') as trips_active,
  (select count(*) from trips where status = 'Draft') as trips_pending,
  (select count(*) from drivers where status = 'On Trip') as drivers_on_duty,
  round(
    (select count(*)::numeric from vehicles where status = 'On Trip') /
    nullif((select count(*)::numeric from vehicles where status != 'Retired'), 0) * 100, 1
  ) as fleet_utilization_pct;

-- Per-vehicle operational cost & efficiency (for Reports screen)
create or replace view v_vehicle_report as
select
  v.id as vehicle_id,
  v.registration_number,
  v.name_model,
  v.acquisition_cost,
  coalesce(sum(distinct m.cost), 0) as total_maintenance_cost,
  coalesce(sum(distinct f.cost), 0) as total_fuel_cost,
  coalesce(sum(distinct f.liters), 0) as total_fuel_liters,
  coalesce(sum(distinct t.planned_distance) filter (where t.status = 'Completed'), 0) as total_distance,
  coalesce(sum(distinct t.revenue) filter (where t.status = 'Completed'), 0) as total_revenue,
  (coalesce(sum(distinct m.cost), 0) + coalesce(sum(distinct f.cost), 0)) as total_operational_cost,
  case when coalesce(sum(distinct f.liters), 0) > 0
    then round(coalesce(sum(distinct t.planned_distance) filter (where t.status = 'Completed'), 0) / sum(distinct f.liters), 2)
    else 0
  end as fuel_efficiency,
  case when v.acquisition_cost > 0
    then round(
      (coalesce(sum(distinct t.revenue) filter (where t.status = 'Completed'), 0)
       - (coalesce(sum(distinct m.cost), 0) + coalesce(sum(distinct f.cost), 0)))
      / v.acquisition_cost, 4)
    else 0
  end as roi
from vehicles v
left join maintenance_logs m on m.vehicle_id = v.id
left join fuel_logs f on f.vehicle_id = v.id
left join trips t on t.vehicle_id = v.id
group by v.id;

-- ============================================================
-- SEED: create your first fleet_manager after signup manually via:
-- update profiles set role = 'fleet_manager' where email = 'you@example.com';
-- ============================================================
