-- SECURITY FIX: prevent users from promoting themselves to admin/owner.
--
-- The "Users can update own profile" policy lets any signed-in user
-- (including anonymous sessions) update every column of their own profile
-- row — including `role`. That meant anyone could run, from the browser:
--
--   supabase.from('profiles').update({ role: 'owner' }).eq('id', <own id>)
--
-- and gain owner access (admin API: list/delete all users, edit any song).
--
-- This trigger rejects role changes coming from end-user API roles
-- (`anon` / `authenticated`). The service-role key used by
-- /api/admin/users and the SQL editor are unaffected.
--
-- Run this once in the Supabase SQL editor against your live project.

create or replace function public.prevent_profile_role_change()
returns trigger as $$
begin
  if new.role is distinct from old.role
     and current_user in ('anon', 'authenticated') then
    raise exception 'Changing profile role is not permitted'
      using errcode = '42501';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row execute procedure public.prevent_profile_role_change();

-- Sanity check: after running, list current owners/admins and make sure
-- nobody unexpected has already escalated themselves.
select id, display_name, role from public.profiles where role in ('owner', 'admin');
