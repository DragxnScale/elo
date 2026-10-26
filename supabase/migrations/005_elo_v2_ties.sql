-- Rating formula v2: rating gap, ties, and experience cushioning.
-- Run once in the Supabase SQL Editor (after 004_members_and_roles.sql).
-- Safe to re-run.
--
-- Mirrors lib/elo.ts calculateEloChange exactly:
--   expected   E1 = 1 / (1 + 10^((R2 - R1) / 400))
--   actual     S1 = 1 win, 0 loss, 0.5 tie
--   margin     x min(3, 1 + (|s1 - s2| / 25)^0.75)
--   swing      80 * (S1 - E1) * margin, and the opposite for player 2
--   losses     x 0.75, and x (1 - 0.4 * min(games, 50) / 50) for experience
--   rounding   floor(x + 0.5), like JavaScript's Math.round
--   floor      a decisive win gains at least 1, and whoever gains always
--              gains more than the other player loses (ratings only go up)

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
  v_margin double precision;
  v_raw1 double precision;
  v_cushion1 double precision;
  v_cushion2 double precision;
  v_p1_gains boolean;
  v_gain integer;
  v_loss integer;
begin
  v_expected := 1.0 / (1.0 + power(10.0::double precision, (p_elo2 - p_elo1)::double precision / 400.0));
  v_actual := case when p_score1 > p_score2 then 1.0 when p_score1 < p_score2 then 0.0 else 0.5 end;
  v_margin := least(3.0, 1.0 + power(abs(p_score1 - p_score2)::double precision / 25.0, 0.75));
  v_cushion1 := 1.0 - (0.4 * least(greatest(p_games1, 0), 50)) / 50.0;
  v_cushion2 := 1.0 - (0.4 * least(greatest(p_games2, 0), 50)) / 50.0;

  v_raw1 := 80.0 * (v_actual - v_expected) * v_margin;
  -- Who gains: the winner; in a tie, the underdog (equal ratings: nobody).
  v_p1_gains := v_actual = 1.0 or (v_actual = 0.5 and v_raw1 >= 0);

  v_gain := floor(abs(v_raw1) + 0.5);
  if v_actual <> 0.5 then
    v_gain := greatest(v_gain, 1);
  end if;
  v_loss := floor(abs(v_raw1) * 0.75 * (case when v_p1_gains then v_cushion2 else v_cushion1 end) + 0.5);
  if v_gain > 0 then
    v_loss := least(v_loss, v_gain - 1);
  end if;

  change1 := case when v_p1_gains then v_gain else -v_loss end;
  change2 := case when v_p1_gains then -v_loss else v_gain end;
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
