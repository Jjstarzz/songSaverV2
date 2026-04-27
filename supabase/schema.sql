-- ============================================================
-- SongSaver — Supabase Schema + RLS Policies
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles (extends auth.users)
create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  display_name      text,
  default_language  text not null default 'en',
  avatar_url        text,
  is_anonymous      boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Teams
create table public.teams (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  created_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- Team Members
create table public.team_members (
  id        uuid primary key default uuid_generate_v4(),
  team_id   uuid not null references public.teams(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  unique(team_id, user_id)
);

-- Songs
create table public.songs (
  id              uuid primary key default uuid_generate_v4(),
  title           text not null,
  artist          text,
  default_key     text,
  preferred_key   text,
  bpm             integer check (bpm > 0 and bpm < 400),
  time_signature  text default '4/4',
  mode            text check (mode in ('major', 'minor')),
  tags            text[] default '{}',
  youtube_url     text,
  spotify_url     text,
  notes           text,
  original_language text check (original_language in ('en','es','fr','pt','de','it','zh','ko','ja','sw','hi','ta','te','tl','ml')),
  created_by      uuid not null references auth.users(id) on delete cascade,
  team_id         uuid references public.teams(id) on delete cascade,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Song Lyrics (multilingual)
create table public.song_lyrics (
  id           uuid primary key default uuid_generate_v4(),
  song_id      uuid not null references public.songs(id) on delete cascade,
  language     text not null,
  lyrics       text not null,
  is_default   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique(song_id, language)
);

-- Services
create table public.services (
  id          uuid primary key default uuid_generate_v4(),
  date        date not null,
  type        text not null default 'sunday_morning' check (type in ('sunday_morning', 'midweek', 'event', 'other')),
  theme       text,
  notes       text,
  status      text not null default 'draft' check (status in ('draft', 'confirmed', 'completed')),
  created_by  uuid not null references auth.users(id) on delete cascade,
  team_id     uuid references public.teams(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Service Songs (setlist)
create table public.service_songs (
  id            uuid primary key default uuid_generate_v4(),
  service_id    uuid not null references public.services(id) on delete cascade,
  song_id       uuid not null references public.songs(id) on delete cascade,
  order_index   integer not null default 0,
  key_override  text,
  notes         text,
  created_at    timestamptz not null default now(),
  unique(service_id, song_id)
);

-- Song Transitions (song A flows well into song B)
create table public.song_transitions (
  id           uuid primary key default uuid_generate_v4(),
  from_song_id uuid not null references public.songs(id) on delete cascade,
  to_song_id   uuid not null references public.songs(id) on delete cascade,
  notes        text,
  created_by   uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique(from_song_id, to_song_id)
);

-- Per-user key preferences (private to each user)
create table public.user_song_preferences (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  song_id     uuid not null references public.songs(id) on delete cascade,
  preferred_key text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(user_id, song_id)
);

-- Rehearsal Recordings
create table public.rehearsal_recordings (
  id          uuid primary key default uuid_generate_v4(),
  file_url    text not null,
  file_name   text,
  duration_s  integer,
  song_id     uuid references public.songs(id) on delete set null,
  service_id  uuid references public.services(id) on delete set null,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index songs_created_by_idx on public.songs(created_by);
create index songs_team_id_idx on public.songs(team_id);
create index song_lyrics_song_id_idx on public.song_lyrics(song_id);
create index services_created_by_idx on public.services(created_by);
create index services_team_id_idx on public.services(team_id);
create index service_songs_service_id_idx on public.service_songs(service_id);
create index team_members_user_id_idx on public.team_members(user_id);
create index team_members_team_id_idx on public.team_members(team_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, is_anonymous)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', 'Worshiper'),
    true
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger songs_updated_at before update on public.songs
  for each row execute procedure public.handle_updated_at();
create trigger services_updated_at before update on public.services
  for each row execute procedure public.handle_updated_at();
create trigger song_lyrics_updated_at before update on public.song_lyrics
  for each row execute procedure public.handle_updated_at();
create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- Helper: check if user is team member
create or replace function public.is_team_member(p_team_id uuid, p_user_id uuid)
returns boolean as $$
  select exists(
    select 1 from public.team_members
    where team_id = p_team_id and user_id = p_user_id
  );
$$ language sql security definer stable;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.songs enable row level security;
alter table public.song_lyrics enable row level security;
alter table public.services enable row level security;
alter table public.service_songs enable row level security;
alter table public.song_transitions enable row level security;
alter table public.user_song_preferences enable row level security;
alter table public.rehearsal_recordings enable row level security;

-- PROFILES
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- TEAMS
create policy "Team members can view their teams"
  on public.teams for select
  using (public.is_team_member(id, auth.uid()));
create policy "Authenticated users can create teams"
  on public.teams for insert
  with check (auth.uid() = created_by);
create policy "Team owners/admins can update team"
  on public.teams for update
  using (exists(
    select 1 from public.team_members
    where team_id = id and user_id = auth.uid() and role in ('owner', 'admin')
  ));

-- TEAM MEMBERS
create policy "Team members can view membership"
  on public.team_members for select
  using (public.is_team_member(team_id, auth.uid()));
create policy "Users can join teams"
  on public.team_members for insert
  with check (auth.uid() = user_id);
create policy "Owners/admins can manage members"
  on public.team_members for delete
  using (
    user_id = auth.uid() or
    exists(
      select 1 from public.team_members tm2
      where tm2.team_id = team_id and tm2.user_id = auth.uid() and tm2.role in ('owner', 'admin')
    )
  );

-- SONGS (global shared library)
create policy "All authenticated users can view all songs"
  on public.songs for select
  using (auth.uid() is not null);
create policy "Authenticated users can create songs"
  on public.songs for insert
  with check (auth.uid() = created_by);
create policy "Only creator can update their song"
  on public.songs for update
  using (created_by = auth.uid());
create policy "Only creator can delete their song"
  on public.songs for delete
  using (created_by = auth.uid());

-- SONG LYRICS (readable by all, writable only by song creator)
create policy "All authenticated users can view lyrics"
  on public.song_lyrics for select
  using (auth.uid() is not null);
create policy "Only song creator can manage lyrics"
  on public.song_lyrics for all
  using (
    exists(
      select 1 from public.songs s
      where s.id = song_id and s.created_by = auth.uid()
    )
  );

-- SERVICES
create policy "Users can view own or team services"
  on public.services for select
  using (
    created_by = auth.uid() or
    (team_id is not null and public.is_team_member(team_id, auth.uid()))
  );
create policy "Authenticated users can create services"
  on public.services for insert
  with check (auth.uid() = created_by);
create policy "Users can update own or team services"
  on public.services for update
  using (
    created_by = auth.uid() or
    (team_id is not null and public.is_team_member(team_id, auth.uid()))
  );
create policy "Users can delete own services"
  on public.services for delete
  using (created_by = auth.uid());

-- SERVICE SONGS
create policy "Users can view setlists for accessible services"
  on public.service_songs for select
  using (
    exists(
      select 1 from public.services sv
      where sv.id = service_id and (
        sv.created_by = auth.uid() or
        (sv.team_id is not null and public.is_team_member(sv.team_id, auth.uid()))
      )
    )
  );
create policy "Users can manage setlists for their services"
  on public.service_songs for all
  using (
    exists(
      select 1 from public.services sv
      where sv.id = service_id and (
        sv.created_by = auth.uid() or
        (sv.team_id is not null and public.is_team_member(sv.team_id, auth.uid()))
      )
    )
  );

-- SONG TRANSITIONS (readable by all, managed by creator)
create policy "All authenticated users can view transitions"
  on public.song_transitions for select
  using (auth.uid() is not null);
create policy "Authenticated users can add transitions"
  on public.song_transitions for insert
  with check (auth.uid() = created_by);
create policy "Creator can delete their transitions"
  on public.song_transitions for delete
  using (auth.uid() = created_by);

-- USER SONG PREFERENCES (fully private)
create policy "Users manage only their own preferences"
  on public.user_song_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- REHEARSAL RECORDINGS
create policy "Users can view own or team recordings"
  on public.rehearsal_recordings for select
  using (
    uploaded_by = auth.uid() or
    (song_id is not null and exists(
      select 1 from public.songs s
      where s.id = song_id and s.team_id is not null and public.is_team_member(s.team_id, auth.uid())
    ))
  );
create policy "Authenticated users can upload recordings"
  on public.rehearsal_recordings for insert
  with check (auth.uid() = uploaded_by);
create policy "Users can delete own recordings"
  on public.rehearsal_recordings for delete
  using (uploaded_by = auth.uid());

-- ============================================================
-- STORAGE (run in Supabase Dashboard > Storage > New Bucket)
-- Bucket name: recordings | Private | Max file size: 100MB
-- Then run these storage policies:
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('recordings', 'recordings', false);
--
-- create policy "Users upload own recordings" on storage.objects for insert
--   with check (bucket_id = 'recordings' and auth.uid()::text = (storage.foldername(name))[1]);
-- create policy "Users view own recordings" on storage.objects for select
--   using (bucket_id = 'recordings' and auth.uid()::text = (storage.foldername(name))[1]);
-- create policy "Users delete own recordings" on storage.objects for delete
--   using (bucket_id = 'recordings' and auth.uid()::text = (storage.foldername(name))[1]);
