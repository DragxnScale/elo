-- Accounts + match history + stats.
-- Run once in the Supabase SQL Editor on an existing project (after schema.sql).
-- Safe to re-run.

-- 1. Public usernames, so profiles can be viewed and players linked by username.
drop policy if exists "Anyone can view profiles" on public.profiles;
create policy "Anyone can view profiles"
  on public.profiles for select
  using (true);

-- 2. Link a player slot on a leaderboard to a user account (optional).
alter table public.players
  add column if not exists user_id uuid references public.profiles (id) on delete set null;

create index if not exists players_user_id_idx on public.players (user_id);
create unique index if not exists players_leaderboard_user_uidx
  on public.players (leaderboard_id, user_id)
  where user_id is not null;

-- 3. Match history. Every recorded match is kept so wins, losses and rating
--    history can be derived.
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  leaderboard_id uuid not null references public.leaderboards (id) on delete cascade,
  player1_id uuid not null references public.players (id) on delete cascade,
  player2_id uuid not null references public.players (id) on delete cascade,
  player1_score integer not null,
  player2_score integer not null,
  player1_elo_before integer not null,
  player2_elo_before integer not null,
  player1_change integer not null,
  player2_change integer not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (player1_id <> player2_id),
  check (player1_score <> player2_score)
);

create index if not exists matches_leaderboard_created_idx
  on public.matches (leaderboard_id, created_at desc);
create index if not exists matches_player1_idx on public.matches (player1_id);
create index if not exists matches_player2_idx on public.matches (player2_id);

alter table public.matches enable row level security;

drop policy if exists "Anyone can view matches" on public.matches;
create policy "Anyone can view matches"
  on public.matches for select
  using (true);

drop policy if exists "Owners record matches" on public.matches;
create policy "Owners record matches"
  on public.matches for insert
  with check (
    exists (
      select 1 from public.leaderboards lb
      where lb.id = matches.leaderboard_id and lb.user_id = auth.uid()
    )
  );

drop policy if exists "Owners delete matches" on public.matches;
create policy "Owners delete matches"
  on public.matches for delete
  using (
    exists (
      select 1 from public.leaderboards lb
      where lb.id = matches.leaderboard_id and lb.user_id = auth.uid()
    )
  );

-- 4. Record a match atomically: lock both players, make sure their ratings
--    have not moved since the change was computed, apply it, log the match.
--    security invoker => the RLS policies above still decide who may do this.
create or replace function public.record_match(
  p_leaderboard_id uuid,
  p_player1_id uuid,
  p_player2_id uuid,
  p_player1_score integer,
  p_player2_score integer,
  p_player1_elo_before integer,
  p_player2_elo_before integer,
  p_player1_change integer,
  p_player2_change integer
)
returns public.matches
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_elo1 integer;
  v_elo2 integer;
  v_match public.matches;
begin
  select elo into v_elo1 from public.players
    where id = p_player1_id and leaderboard_id = p_leaderboard_id
    for update;
  select elo into v_elo2 from public.players
    where id = p_player2_id and leaderboard_id = p_leaderboard_id
    for update;

  if v_elo1 is null or v_elo2 is null then
    raise exception 'Players not found on this leaderboard.' using errcode = 'P0002';
  end if;

  if v_elo1 <> p_player1_elo_before or v_elo2 <> p_player2_elo_before then
    raise exception 'Ratings changed since this match was previewed.' using errcode = '40001';
  end if;

  update public.players set elo = v_elo1 + p_player1_change where id = p_player1_id;
  update public.players set elo = v_elo2 + p_player2_change where id = p_player2_id;

  insert into public.matches (
    leaderboard_id, player1_id, player2_id,
    player1_score, player2_score,
    player1_elo_before, player2_elo_before,
    player1_change, player2_change,
    created_by
  ) values (
    p_leaderboard_id, p_player1_id, p_player2_id,
    p_player1_score, p_player2_score,
    v_elo1, v_elo2,
    p_player1_change, p_player2_change,
    auth.uid()
  )
  returning * into v_match;

  return v_match;
end;
$$;

grant execute on function public.record_match(
  uuid, uuid, uuid, integer, integer, integer, integer, integer, integer
) to authenticated;

-- 5. Realtime for match feeds.
do $$
begin
  alter publication supabase_realtime add table public.matches;
exception when duplicate_object then null;
end $$;
