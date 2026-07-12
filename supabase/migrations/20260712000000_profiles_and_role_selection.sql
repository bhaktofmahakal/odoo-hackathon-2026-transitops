-- Create user_role type if it doesn't exist
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('fleet_manager', 'driver', 'safety_officer', 'financial_analyst');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role user_role default 'driver',
  region text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Safe trigger function with error handling
create or replace function public.fn_handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested_role user_role;
begin
  -- Parse role from metadata, default to driver
  requested_role := case new.raw_user_meta_data ->> 'role'
    when 'fleet_manager' then 'fleet_manager'::user_role
    when 'safety_officer' then 'safety_officer'::user_role
    when 'financial_analyst' then 'financial_analyst'::user_role
    else 'driver'::user_role
  end;

  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    requested_role
  )
  on conflict (id) do nothing;

  return new;
exception
  when others then
    -- Don't let profile errors break signup
    raise warning 'Failed to create profile for user %: %', new.id, sqlerrm;
    return new;
end;
$$;

-- Recreate trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.fn_handle_new_user();

-- Policies
drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- Permissions
revoke update on public.profiles from authenticated;
grant select, update (full_name, email, region) on public.profiles to authenticated;
