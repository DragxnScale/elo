-- Run in Supabase SQL Editor after creating a project.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.leaderboards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  share_code text not null unique,
  starting_elo integer not null default 1000 check (starting_elo >= 100 and starting_elo <= 10000),
  created_at timestamptz not null default now()
);

create index if not exists leaderboards_user_id_idx on public.leaderboards (user_id);
create index if not exists leaderboards_share_code_idx on public.leaderboards (share_code);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  leaderboard_id uuid not null references public.leaderboards (id) on delete cascade,
  name text not null,
  elo integer not null,
  created_at timestamptz not null default now(),
  unique (leaderboard_id, name)
);

create index if not exists players_leaderboard_id_idx on public.players (leaderboard_id);

alter table public.profiles enable row level security;
alter table public.leaderboards enable row level security;
alter table public.players enable row level security;

-- Profiles
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Leaderboards: owners full access; anyone can read by share code (via anon key + select)
create policy "Owners manage leaderboards"
  on public.leaderboards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Anyone can view leaderboards"
  on public.leaderboards for select
  using (true);

-- Players: readable for any leaderboard; writable by owner
create policy "Anyone can view players"
  on public.players for select
  using (true);

create policy "Owners manage players"
  on public.players for all
  using (
    exists (
      select 1 from public.leaderboards lb
      where lb.id = players.leaderboard_id and lb.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.leaderboards lb
      where lb.id = players.leaderboard_id and lb.user_id = auth.uid()
    )
  );

-- Realtime
alter publication supabase_realtime add table public.players;
