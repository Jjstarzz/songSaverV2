-- ============================================================
-- SongSaver feature migration (November 2026)
-- Singers & preferred keys · Arrangement versions · Team assignments
-- Service templates · Service feedback
--
-- Purely additive: new tables, three new nullable columns on
-- service_songs, and two helper functions. Nothing existing is altered
-- or removed. Safe to run more than once.
-- ============================================================

-- ── Helpers ────────────────────────────────────────────────
create or replace function public.can_edit_service(p_service_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists(
    select 1 from public.services s
    where s.id = p_service_id
      and (s.created_by = auth.uid()
           or (s.team_id is not null and public.is_team_member(s.team_id, auth.uid())))
  ) or public.is_app_admin(auth.uid());
$$;

create or replace function public.can_read_service(p_service_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists(
    select 1 from public.services s
    where s.id = p_service_id
      and (s.is_public or s.created_by = auth.uid()
           or (s.team_id is not null and public.is_team_member(s.team_id, auth.uid())))
  ) or public.is_app_admin(auth.uid());
$$;

-- ── Singers and their keys ────────────────────────────────
create table if not exists public.singers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) between 1 and 80),
  voice       text,                -- e.g. "Alto", "Tenor", "Low A – high E"
  notes       text,
  user_id     uuid references auth.users(id) on delete set null,  -- optional link to an account
  created_by  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.singer_song_keys (
  id          uuid primary key default gen_random_uuid(),
  singer_id   uuid not null references public.singers(id) on delete cascade,
  song_id     uuid not null references public.songs(id) on delete cascade,
  key         text not null,
  notes       text,
  created_by  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (singer_id, song_id)
);
create index if not exists singer_song_keys_song_idx on public.singer_song_keys(song_id);

-- ── Arrangement versions ─────────────────────────────────
create table if not exists public.song_arrangements (
  id          uuid primary key default gen_random_uuid(),
  song_id     uuid not null references public.songs(id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 80),
  key         text,
  tempo       integer check (tempo is null or (tempo > 0 and tempo < 400)),
  structure   text,                -- e.g. "Intro · V1 · C · V2 · C · B · C ×2 · Tag"
  intro       text,
  ending      text,
  notes       text,
  created_by  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists song_arrangements_song_idx on public.song_arrangements(song_id);

-- Setlist rows can now point at an arrangement, a singer, and a slot label
alter table public.service_songs add column if not exists arrangement_id uuid references public.song_arrangements(id) on delete set null;
alter table public.service_songs add column if not exists singer_id uuid references public.singers(id) on delete set null;
alter table public.service_songs add column if not exists slot_label text;

-- ── Team roles and assignments ───────────────────────────
create table if not exists public.service_assignments (
  id          uuid primary key default gen_random_uuid(),
  service_id  uuid not null references public.services(id) on delete cascade,
  role        text not null check (char_length(trim(role)) between 1 and 40),
  person_name text not null check (char_length(trim(person_name)) between 1 and 80),
  user_id     uuid references auth.users(id) on delete set null,
  singer_id   uuid references public.singers(id) on delete set null,
  status      text not null default 'pending' check (status in ('pending', 'confirmed', 'declined')),
  tasks       text,
  created_by  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists service_assignments_service_idx on public.service_assignments(service_id);

-- ── Service templates ────────────────────────────────────
create table if not exists public.service_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) between 1 and 80),
  type        text,
  theme       text,
  notes       text,
  -- [{ "label": "Opening", "song_id": "…" | null, "key": "G" | null }]
  slots       jsonb not null default '[]'::jsonb,
  created_by  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- ── Service feedback ─────────────────────────────────────
create table if not exists public.service_feedback (
  id               uuid primary key default gen_random_uuid(),
  service_id       uuid not null references public.services(id) on delete cascade,
  song_id          uuid references public.songs(id) on delete set null,   -- optional: about one song
  author_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author_name      text,
  went_well        text,
  difficult        text,   -- e.g. keys that were hard to sing
  transition_notes text,
  created_at       timestamptz not null default now()
);
create index if not exists service_feedback_service_idx on public.service_feedback(service_id);
create index if not exists service_feedback_song_idx on public.service_feedback(song_id);

-- ── Row-level security ───────────────────────────────────
alter table public.singers             enable row level security;
alter table public.singer_song_keys    enable row level security;
alter table public.song_arrangements   enable row level security;
alter table public.service_assignments enable row level security;
alter table public.service_templates   enable row level security;
alter table public.service_feedback    enable row level security;

-- Singers: shared team list; editable by whoever added them (or an admin)
drop policy if exists singers_read on public.singers;
create policy singers_read on public.singers for select to authenticated using (true);
drop policy if exists singers_insert on public.singers;
create policy singers_insert on public.singers for insert to authenticated with check (created_by = auth.uid());
drop policy if exists singers_modify on public.singers;
create policy singers_modify on public.singers for update to authenticated
  using (created_by = auth.uid() or user_id = auth.uid() or public.is_app_admin(auth.uid()));
drop policy if exists singers_delete on public.singers;
create policy singers_delete on public.singers for delete to authenticated
  using (created_by = auth.uid() or public.is_app_admin(auth.uid()));

-- Singer keys: readable by all; written by the singer's creator, the singer themself, or an admin
drop policy if exists singer_keys_read on public.singer_song_keys;
create policy singer_keys_read on public.singer_song_keys for select to authenticated using (true);
drop policy if exists singer_keys_write on public.singer_song_keys;
create policy singer_keys_write on public.singer_song_keys for all to authenticated
  using (exists (select 1 from public.singers s where s.id = singer_id
                 and (s.created_by = auth.uid() or s.user_id = auth.uid()))
         or public.is_app_admin(auth.uid()))
  with check (exists (select 1 from public.singers s where s.id = singer_id
                      and (s.created_by = auth.uid() or s.user_id = auth.uid()))
              or public.is_app_admin(auth.uid()));

-- Arrangements: readable by all; written by their creator, the song's owner, or an admin
drop policy if exists arrangements_read on public.song_arrangements;
create policy arrangements_read on public.song_arrangements for select to authenticated using (true);
drop policy if exists arrangements_insert on public.song_arrangements;
create policy arrangements_insert on public.song_arrangements for insert to authenticated with check (created_by = auth.uid());
drop policy if exists arrangements_modify on public.song_arrangements;
create policy arrangements_modify on public.song_arrangements for update to authenticated
  using (created_by = auth.uid()
         or exists (select 1 from public.songs s where s.id = song_id and s.created_by = auth.uid())
         or public.is_app_admin(auth.uid()));
drop policy if exists arrangements_delete on public.song_arrangements;
create policy arrangements_delete on public.song_arrangements for delete to authenticated
  using (created_by = auth.uid()
         or exists (select 1 from public.songs s where s.id = song_id and s.created_by = auth.uid())
         or public.is_app_admin(auth.uid()));

-- Assignments: visible to anyone who can see the service; managed by its editors;
-- the assigned person can update their own row (e.g. confirm availability)
drop policy if exists assignments_read on public.service_assignments;
create policy assignments_read on public.service_assignments for select to authenticated
  using (public.can_read_service(service_id));
drop policy if exists assignments_insert on public.service_assignments;
create policy assignments_insert on public.service_assignments for insert to authenticated
  with check (public.can_edit_service(service_id));
drop policy if exists assignments_update on public.service_assignments;
create policy assignments_update on public.service_assignments for update to authenticated
  using (public.can_edit_service(service_id) or user_id = auth.uid());
drop policy if exists assignments_delete on public.service_assignments;
create policy assignments_delete on public.service_assignments for delete to authenticated
  using (public.can_edit_service(service_id));

-- Templates: shared; editable by their creator or an admin
drop policy if exists templates_read on public.service_templates;
create policy templates_read on public.service_templates for select to authenticated using (true);
drop policy if exists templates_insert on public.service_templates;
create policy templates_insert on public.service_templates for insert to authenticated with check (created_by = auth.uid());
drop policy if exists templates_modify on public.service_templates;
create policy templates_modify on public.service_templates for update to authenticated
  using (created_by = auth.uid() or public.is_app_admin(auth.uid()));
drop policy if exists templates_delete on public.service_templates;
create policy templates_delete on public.service_templates for delete to authenticated
  using (created_by = auth.uid() or public.is_app_admin(auth.uid()));

-- Feedback: anyone who can see the service can read and add; authors and service editors can delete
drop policy if exists feedback_read on public.service_feedback;
create policy feedback_read on public.service_feedback for select to authenticated
  using (public.can_read_service(service_id));
drop policy if exists feedback_insert on public.service_feedback;
create policy feedback_insert on public.service_feedback for insert to authenticated
  with check (author_id = auth.uid() and public.can_read_service(service_id));
drop policy if exists feedback_delete on public.service_feedback;
create policy feedback_delete on public.service_feedback for delete to authenticated
  using (author_id = auth.uid() or public.can_edit_service(service_id));
