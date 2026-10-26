-- Rating formula v2: performance against expectations, ties, and
-- experience cushioning.
-- Run once in the Supabase SQL Editor (after 004_members_and_roles.sql).
-- Safe to re-run (also if you ran an earlier version of this file).
--
-- Mirrors lib/elo.ts calculateEloChange exactly:
--   expected share   E1 = 1 / (1 + 10^((R2 - R1) / 400))
--   actual share     A1 = 1/2 + 1/2 * (s1 - s2) / (|s1| + |s2|)   (tie = 1/2)
--   factor           K  = 200 + 0.1 * |R1 - R2|
--   swing            K * (A1 - E1); whoever beat expectations gains |swing|
--   losses           x 0.75, and x (1 - 0.4 * min(games, 50) / 50) for experience
--   floor            the gainer always gains at least 1 more than the other loses
--   rounding         floor(x + 0.5), like JavaScript's Math.round

-- 1. Ties are allowed now.
do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.matches'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%player1_score <> player2_score%'
  loop
    execute format('alter table public.matches drop constraint %I', c.conname);
  end loop;
end $$;

-- 2. The formula. games1 / games2: matches each player had already played.
create or replace function public.elo_change(
  p_elo1 integer,
  p_elo2 integer,
  p_score1 integer,
  p_score2 integer,
  p_games1 integer,
  p_games2 integer,
  out change1 integer,
  out change2 integer
)
language plpgsql
immutable
set search_path = public
as $$
declare
  v_expected double precision;
  v_actual double precision;
  v_spread double precision;
  v_k double precision;
  v_swing double precision;
  v_size double precision;
  v_cushion1 double precision;
  v_cushion2 double precision;
  v_gain integer;
  v_loss integer;
begin
  v_expected := 1.0 / (1.0 + power(10.0::double precision, (p_elo2 - p_elo1)::double precision / 400.0));
  v_spread := abs(p_score1)::double precision + abs(p_score2)::double precision;
  if v_spread = 0 then
    v_actual := 0.5;
  else
    v_actual := 0.5 + (0.5 * (p_score1 - p_score2)::double precision) / v_spread;
  end if;
  v_k := 200.0 + 0.1 * abs(p_elo1 - p_elo2)::double precision;
  v_cushion1 := 1.0 - (0.4 * least(greatest(p_games1, 0), 50)) / 50.0;
  v_cushion2 := 1.0 - (0.4 * least(greatest(p_games2, 0), 50)) / 50.0;

  -- Positive: player 1 beat expectations. Negative: player 2 did.
  v_swing := v_k * (v_actual - v_expected);
  v_size := abs(v_swing);
  v_gain := floor(v_size + 0.5);
  v_loss := floor(v_size * 0.75 * (case when v_swing > 0 then v_cushion2 else v_cushion1 end) + 0.5);
  if v_gain > 0 then
    v_loss := least(v_loss, v_gain - 1);
  end if;

  if v_swing > 0 then
    change1 := v_gain; change2 := -v_loss;
  elsif v_swing < 0 then
    change1 := -v_loss; change2 := v_gain;
  else
    change1 := 0; change2 := 0;
  end if;
end;
$$;

-- 3. Record a match (owner or admin), ties included. Same signature as
--    before; the change arguments are ignored.
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
security definer
set search_path = public
as $$
declare
  v_elo1 integer;
  v_elo2 integer;
  v_games1 integer;
  v_games2 integer;
  v_change1 integer;
  v_change2 integer;
  v_match public.matches;
begin
  if public.board_role(p_leaderboard_id) is null then
    raise exception 'Only the board owner or an admin can record matches.' using errcode = '42501';
  end if;

  if p_player1_id = p_player2_id then
    raise exception 'A match needs two different players.' using errcode = '22023';
  end if;

  select elo into v_elo1 from public.players
    where id = p_player1_id and leaderboard_id = p_leaderboard_id and status = 'active'
    for update;
  select elo into v_elo2 from public.players
    where id = p_player2_id and leaderboard_id = p_leaderboard_id and status = 'active'
    for update;

  if v_elo1 is null or v_elo2 is null then
    raise exception 'Players not found on this leaderboard.' using errcode = 'P0002';
  end if;

  if v_elo1 <> p_player1_elo_before or v_elo2 <> p_player2_elo_before then
    raise exception 'Ratings changed since this match was previewed.' using errcode = '40001';
  end if;

  select count(*) into v_games1 from public.matches
    where leaderboard_id = p_leaderboard_id
      and (player1_id = p_player1_id or player2_id = p_player1_id);
  select count(*) into v_games2 from public.matches
    where leaderboard_id = p_leaderboard_id
      and (player1_id = p_player2_id or player2_id = p_player2_id);

  select change1, change2 into v_change1, v_change2
    from public.elo_change(v_elo1, v_elo2, p_player1_score, p_player2_score, v_games1, v_games2);

  update public.players set elo = v_elo1 + v_change1 where id = p_player1_id;
  update public.players set elo = v_elo2 + v_change2 where id = p_player2_id;

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
    v_change1, v_change2,
    auth.uid()
  )
  returning * into v_match;

  return v_match;
end;
$$;

-- 4. The v1 formula (four arguments) is no longer used.
drop function if exists public.elo_change(integer, integer, integer, integer);

revoke execute on function public.record_match(
  uuid, uuid, uuid, integer, integer, integer, integer, integer, integer
) from public, anon;
grant execute on function public.record_match(
  uuid, uuid, uuid, integer, integer, integer, integer, integer, integer
) to authenticated;
