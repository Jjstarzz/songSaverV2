-- OPTIONAL: let anonymous visitors read services marked public.
--
-- The existing "services_select" policy is limited to the `authenticated`
-- role, so anonymous requests can't see public services (and therefore the
-- setlist/song/lyrics policies that check "is the service public?" fail too).
-- The public-view API route works around this with the server-only service
-- key; apply this if you'd rather rely on row-level security alone.

drop policy if exists "public_services_readable_by_anyone" on public.services;
create policy "public_services_readable_by_anyone"
  on public.services for select
  to anon
  using (is_public = true);
