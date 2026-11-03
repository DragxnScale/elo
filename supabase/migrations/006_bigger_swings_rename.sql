-- Bigger rating swings, and admins can rename players.
-- Run once in the Supabase SQL Editor (after 005_elo_v2_ties.sql).
-- Safe to re-run.

-- 1. The factor triples: K = 600 + 0.3 * |R1 - R2| (was 200 + 0.1 * gap).
--    Everything else is as in 005, and lib/elo.ts mirrors it exactly.
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
  v_k := 600.0 + 0.3 * abs(p_elo1 - p_elo2)::double precision;
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

-- 2. Rename a player: owner or admin of their board. Names are trimmed,
--    1-40 characters, and unique on the board (as before).
create or replace function public.rename_player(p_player_id uuid, p_name text)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players;
  v_name text := btrim(coalesce(p_name, ''));
begin
  select * into v_player from public.players where id = p_player_id;
  if v_player.id is null then
    raise exception 'Player not found.' using errcode = 'P0002';
  end if;

  if public.board_role(v_player.leaderboard_id) is null then
    raise exception 'Only the board owner or an admin can rename players.' using errcode = '42501';
  end if;

  if v_name = '' or char_length(v_name) > 40 then
    raise exception 'Names must be 1 to 40 characters.' using errcode = '22023';
  end if;

  update public.players set name = v_name where id = p_player_id
    returning * into v_player;
  return v_player;
end;
$$;

revoke execute on function public.rename_player(uuid, text) from public, anon;
grant execute on function public.rename_player(uuid, text) to authenticated;
