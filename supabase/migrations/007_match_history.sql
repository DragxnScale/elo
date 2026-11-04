-- Match history: delete any match (soft), recalculate everything after it in
-- order, and restore deleted matches.
-- Run once in the Supabase SQL Editor (after 006_bigger_swings_rename.sql).
-- Safe to re-run.
--
-- How a recalculation works (delete_match / restore_match):
--   1. Lock the board, so recording, deleting and restoring take turns.
--   2. Work out every player's rating at the match's point in time from the
--      live history (the rating going into their next live match or manual
--      rating change after that point, or their current rating if none).
--   3. Flip the match to deleted (or back to live).
--   4. Replay every live match and manual rating change from that point on,
--      oldest first. A match is recomputed with the current formula only if
--      one of its players is affected: one of the two players of the deleted
--      or restored match (their games-played count changed), or someone whose
--      rating has already moved in this replay. Other matches keep their
--      stored numbers, so history recorded under older formulas isn't
--      rewritten. A manual rating change still sets that rating at its time.
--   5. Save the new ratings.

-- 1. Soft delete.
alter table public.matches add column if not exists deleted_at timestamptz;
alter table public.matches add column if not exists deleted_by uuid references auth.users (id) on delete set null;

create index if not exists matches_board_order_idx
  on public.matches (leaderboard_id, created_at, id);

-- History only changes through the functions below (they keep ratings in
-- step). Deleting a board still removes its matches.
revoke delete on public.matches from anon, authenticated;
drop policy if exists "Owners delete matches" on public.matches;

-- 2. Ratings for every player on a board at a point in history, as a jsonb
--    map of player id -> rating. Internal.
create or replace function public.ratings_at(
  p_leaderboard_id uuid,
  p_at timestamptz,
  p_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ratings jsonb := '{}'::jsonb;
  v_player record;
  v_before integer;
begin
  for v_player in
    select id, elo from public.players where leaderboard_id = p_leaderboard_id
  loop
    select e.before into v_before from (
      select m.created_at as at, 0 as kind, m.id,
        case when m.player1_id = v_player.id then m.player1_elo_before else m.player2_elo_before end as before
      from public.matches m
      where m.leaderboard_id = p_leaderboard_id
        and m.deleted_at is null
        and (m.player1_id = v_player.id or m.player2_id = v_player.id)
        and (m.created_at, m.id) >= (p_at, p_id)
      union all
      select a.created_at, 1, a.id, a.elo_before
      from public.rating_adjustments a
      where a.player_id = v_player.id and a.created_at >= p_at
    ) e
    order by e.at, e.kind, e.id
    limit 1;

    v_ratings := v_ratings || jsonb_build_object(v_player.id::text, coalesce(v_before, v_player.elo));
  end loop;
  return v_ratings;
end;
$$;

-- 3. Replay the live history of a board from a point onwards. Internal.
create or replace function public.replay_matches(
  p_leaderboard_id uuid,
  p_at timestamptz,
  p_id uuid,
  p_seed uuid[],
  p_ratings jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rating jsonb := p_ratings;
  v_games jsonb := '{}'::jsonb;
  v_changed uuid[] := '{}';
  v_player record;
  e record;
  v_touched1 boolean;
  v_touched2 boolean;
  v_e1 integer;
  v_e2 integer;
  v_g1 integer;
  v_g2 integer;
  v_c1 integer;
  v_c2 integer;
begin
  -- Live games each player had played before this point.
  for v_player in
    select pl.id, (
      select count(*) from public.matches m
      where m.leaderboard_id = p_leaderboard_id
        and m.deleted_at is null
        and (m.player1_id = pl.id or m.player2_id = pl.id)
        and (m.created_at, m.id) < (p_at, p_id)
    ) as n
    from public.players pl where pl.leaderboard_id = p_leaderboard_id
  loop
    v_games := v_games || jsonb_build_object(v_player.id::text, v_player.n);
  end loop;

  for e in
    select 0 as kind, m.created_at as at, m.id,
      m.player1_id, m.player2_id, m.player1_score, m.player2_score,
      m.player1_elo_before, m.player2_elo_before, m.player1_change, m.player2_change,
      null::uuid as adj_player, null::integer as adj_after
    from public.matches m
    where m.leaderboard_id = p_leaderboard_id
      and m.deleted_at is null
      and (m.created_at, m.id) >= (p_at, p_id)
    union all
    select 1, a.created_at, a.id,
      null, null, null, null, null, null, null, null,
      a.player_id, a.elo_after
    from public.rating_adjustments a
    where a.leaderboard_id = p_leaderboard_id and a.created_at >= p_at
    order by 2, 1, 3
  loop
    if e.kind = 1 then
      -- A manual rating change sets the rating outright at its time.
      update public.rating_adjustments
        set elo_before = (v_rating ->> e.adj_player::text)::integer
        where id = e.id
          and elo_before is distinct from (v_rating ->> e.adj_player::text)::integer;
      v_rating := jsonb_set(v_rating, array[e.adj_player::text], to_jsonb(e.adj_after));
      v_changed := array_remove(v_changed, e.adj_player);
      continue;
    end if;

    v_touched1 := e.player1_id = any(p_seed) or e.player1_id = any(v_changed);
    v_touched2 := e.player2_id = any(p_seed) or e.player2_id = any(v_changed);
    -- Untouched players go in at their stored rating (history as recorded).
    v_e1 := case when v_touched1 then (v_rating ->> e.player1_id::text)::integer else e.player1_elo_before end;
    v_e2 := case when v_touched2 then (v_rating ->> e.player2_id::text)::integer else e.player2_elo_before end;
    v_g1 := coalesce((v_games ->> e.player1_id::text)::integer, 0);
    v_g2 := coalesce((v_games ->> e.player2_id::text)::integer, 0);

    if v_touched1 or v_touched2 then
      select change1, change2 into v_c1, v_c2
        from public.elo_change(v_e1, v_e2, e.player1_score, e.player2_score, v_g1, v_g2);

      if (v_e1, v_e2, v_c1, v_c2) is distinct from
         (e.player1_elo_before, e.player2_elo_before, e.player1_change, e.player2_change) then
        update public.matches
          set player1_elo_before = v_e1, player2_elo_before = v_e2,
              player1_change = v_c1, player2_change = v_c2
          where id = e.id;
      end if;

      -- Anyone who now comes out of this match differently is affected from here on.
      v_changed := array_remove(v_changed, e.player1_id);
      v_changed := array_remove(v_changed, e.player2_id);
      if v_e1 + v_c1 <> e.player1_elo_before + e.player1_change and not e.player1_id = any(p_seed) then
        v_changed := v_changed || e.player1_id;
      end if;
      if v_e2 + v_c2 <> e.player2_elo_before + e.player2_change and not e.player2_id = any(p_seed) then
        v_changed := v_changed || e.player2_id;
      end if;
    else
      v_c1 := e.player1_change;
      v_c2 := e.player2_change;
    end if;

    v_rating := jsonb_set(v_rating, array[e.player1_id::text], to_jsonb(v_e1 + v_c1));
    v_rating := jsonb_set(v_rating, array[e.player2_id::text], to_jsonb(v_e2 + v_c2));
    v_games := jsonb_set(v_games, array[e.player1_id::text], to_jsonb(v_g1 + 1));
    v_games := jsonb_set(v_games, array[e.player2_id::text], to_jsonb(v_g2 + 1));
  end loop;

  update public.players pl
    set elo = (v_rating ->> pl.id::text)::integer
    where pl.leaderboard_id = p_leaderboard_id
      and v_rating ? pl.id::text
      and pl.elo <> (v_rating ->> pl.id::text)::integer;
end;
$$;

-- 4. Delete a match (owner or admin). It stays in the history as deleted and
--    can be restored; ratings after it are recalculated.
create or replace function public.delete_match(p_match_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches;
  v_ratings jsonb;
begin
  select * into v_match from public.matches where id = p_match_id;
  if v_match.id is null then
    raise exception 'Match not found.' using errcode = 'P0002';
  end if;
  if public.board_role(v_match.leaderboard_id) is null then
    raise exception 'Only the board owner or an admin can delete matches.' using errcode = '42501';
  end if;

  perform 1 from public.leaderboards where id = v_match.leaderboard_id for update;
  select * into v_match from public.matches where id = p_match_id;
  if v_match.deleted_at is not null then
    raise exception 'That match is already deleted.' using errcode = '22023';
  end if;

  v_ratings := public.ratings_at(v_match.leaderboard_id, v_match.created_at, v_match.id);
  update public.matches set deleted_at = now(), deleted_by = auth.uid()
    where id = p_match_id
    returning * into v_match;
  perform public.replay_matches(
    v_match.leaderboard_id, v_match.created_at, v_match.id,
    array[v_match.player1_id, v_match.player2_id], v_ratings
  );
  return v_match;
end;
$$;

-- 5. Restore a deleted match (owner or admin): it goes back in at its
--    original time and everything after it is recalculated.
create or replace function public.restore_match(p_match_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches;
  v_ratings jsonb;
begin
  select * into v_match from public.matches where id = p_match_id;
  if v_match.id is null then
    raise exception 'Match not found.' using errcode = 'P0002';
  end if;
  if public.board_role(v_match.leaderboard_id) is null then
    raise exception 'Only the board owner or an admin can restore matches.' using errcode = '42501';
  end if;

  perform 1 from public.leaderboards where id = v_match.leaderboard_id for update;
  select * into v_match from public.matches where id = p_match_id;
  if v_match.deleted_at is null then
    raise exception 'That match isn''t deleted.' using errcode = '22023';
  end if;

  v_ratings := public.ratings_at(v_match.leaderboard_id, v_match.created_at, v_match.id);
  update public.matches set deleted_at = null, deleted_by = null
    where id = p_match_id
    returning * into v_match;
  perform public.replay_matches(
    v_match.leaderboard_id, v_match.created_at, v_match.id,
    array[v_match.player1_id, v_match.player2_id], v_ratings
  );
  select * into v_match from public.matches where id = p_match_id;
  return v_match;
end;
$$;

-- 6. Undo the newest match: now a soft delete of it (restorable).
create or replace function public.undo_last_match(p_leaderboard_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if public.board_role(p_leaderboard_id) is null then
    raise exception 'Only the board owner or an admin can undo matches.' using errcode = '42501';
  end if;
  select id into v_id from public.matches
    where leaderboard_id = p_leaderboard_id and deleted_at is null
    order by created_at desc, id desc
    limit 1;
  if v_id is null then
    raise exception 'There are no matches to undo.' using errcode = 'P0002';
  end if;
  return public.delete_match(v_id);
end;
$$;

-- 7. Record a match: as in 005, but it waits its turn on the board and only
--    counts live (not deleted) games for the experience cushion.
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

  perform 1 from public.leaderboards where id = p_leaderboard_id for update;

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
    where leaderboard_id = p_leaderboard_id and deleted_at is null
      and (player1_id = p_player1_id or player2_id = p_player1_id);
  select count(*) into v_games2 from public.matches
    where leaderboard_id = p_leaderboard_id and deleted_at is null
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

-- 8. Who may call what.
revoke execute on function public.ratings_at(uuid, timestamptz, uuid) from public, anon, authenticated;
revoke execute on function public.replay_matches(uuid, timestamptz, uuid, uuid[], jsonb) from public, anon, authenticated;
revoke execute on function public.delete_match(uuid) from public, anon;
revoke execute on function public.restore_match(uuid) from public, anon;
grant execute on function public.delete_match(uuid) to authenticated;
grant execute on function public.restore_match(uuid) to authenticated;
revoke execute on function public.undo_last_match(uuid) from public, anon;
grant execute on function public.undo_last_match(uuid) to authenticated;
revoke execute on function public.record_match(
  uuid, uuid, uuid, integer, integer, integer, integer, integer, integer
) from public, anon;
grant execute on function public.record_match(
  uuid, uuid, uuid, integer, integer, integer, integer, integer, integer
) to authenticated;
