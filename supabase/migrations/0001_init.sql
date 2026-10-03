-- StatApp schema. Run once in the Supabase SQL editor (or with the Supabase CLI).
-- IDs are generated on the device so rows can be created offline and uploaded
-- later; uploads are upserts, so retrying the same row is always safe.

create table if not exists public.matches (
  id uuid primary key,
  home_name text not null,
  away_name text not null,
  status text not null check (status in ('live', 'finished')),
  clock jsonb not null,
  home_possession_ms bigint not null default 0,
  away_possession_ms bigint not null default 0,
  match_ms bigint not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.events (
  id uuid primary key,
  match_id uuid not null references public.matches (id) on delete cascade,
  team text not null check (team in ('home', 'away')),
  type text not null check (type in ('goal', 'shot', 'shot_on_goal', 'chance_created', 'pass', 'tackle', 'foul')),
  match_ms integer not null,
  player text,
  assist text,
  recorded_at timestamptz not null,
  updated_at timestamptz not null,
  deleted boolean not null default false
);
create index if not exists events_match_id_idx on public.events (match_id);

create table if not exists public.players (
  id uuid primary key,
  name text not null,
  team text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted boolean not null default false
);

-- Row Level Security. There is no login yet, so the app's public key may read
-- and write these tables. Anyone who has that key (it ships inside the web app)
-- could do the same, so add authentication before sharing the app widely.
alter table public.matches enable row level security;
alter table public.events enable row level security;
alter table public.players enable row level security;

create policy "anon read matches" on public.matches for select to anon using (true);
create policy "anon insert matches" on public.matches for insert to anon with check (true);
create policy "anon update matches" on public.matches for update to anon using (true) with check (true);

create policy "anon read events" on public.events for select to anon using (true);
create policy "anon insert events" on public.events for insert to anon with check (true);
create policy "anon update events" on public.events for update to anon using (true) with check (true);

create policy "anon read players" on public.players for select to anon using (true);
create policy "anon insert players" on public.players for insert to anon with check (true);
create policy "anon update players" on public.players for update to anon using (true) with check (true);
