create or replace function public.fn_handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested_role user_role;
begin
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
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.fn_handle_new_user();

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

revoke update on public.profiles from authenticated;
grant update (full_name, email, region) on public.profiles to authenticated;
