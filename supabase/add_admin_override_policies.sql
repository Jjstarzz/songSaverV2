-- Lets platform admins/owners (profiles.role) edit or delete songs and
-- services they didn't create themselves. Previously these policies only
-- checked created_by / team membership, so the admin role granted from
-- Settings > Users had no effect on editing permissions.
-- Run this once in the Supabase SQL editor against your live project.

create or replace function public.is_app_admin(p_user_id uuid)
returns boolean as $$
  select exists(
    select 1 from public.profiles
    where id = p_user_id and role in ('admin', 'owner')
  );
$$ language sql security definer stable;

-- SONGS
drop policy if exists "Only creator can update their song" on public.songs;
create policy "Only creator can update their song"
  on public.songs for update
  using (created_by = auth.uid() or public.is_app_admin(auth.uid()));

drop policy if exists "Only creator can delete their song" on public.songs;
create policy "Only creator can delete their song"
  on public.songs for delete
  using (created_by = auth.uid() or public.is_app_admin(auth.uid()));

-- SONG LYRICS
drop policy if exists "Only song creator can manage lyrics" on public.song_lyrics;
create policy "Only song creator can manage lyrics"
  on public.song_lyrics for all
  using (
    exists(
      select 1 from public.songs s
      where s.id = song_id and s.created_by = auth.uid()
    ) or public.is_app_admin(auth.uid())
  );

-- SERVICES
drop policy if exists "Users can update own or team services" on public.services;
create policy "Users can update own or team services"
  on public.services for update
  using (
    created_by = auth.uid() or
    (team_id is not null and public.is_team_member(team_id, auth.uid())) or
    public.is_app_admin(auth.uid())
  );

drop policy if exists "Users can delete own services" on public.services;
create policy "Users can delete own services"
  on public.services for delete
  using (created_by = auth.uid() or public.is_app_admin(auth.uid()));

-- SERVICE SONGS
drop policy if exists "Users can manage setlists for their services" on public.service_songs;
create policy "Users can manage setlists for their services"
  on public.service_songs for all
  using (
    exists(
      select 1 from public.services sv
      where sv.id = service_id and (
        sv.created_by = auth.uid() or
        (sv.team_id is not null and public.is_team_member(sv.team_id, auth.uid()))
      )
    ) or public.is_app_admin(auth.uid())
  );
