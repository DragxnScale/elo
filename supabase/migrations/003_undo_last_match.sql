-- Undo the most recent match on a leaderboard.
-- Run once in the Supabase SQL Editor (after 002_accounts_and_stats.sql).
-- Safe to re-run.

-- Puts both players back to their ratings from before the board's latest
-- match and deletes it, in one transaction. Only the latest match can be
-- undone, so calling it again steps further back through the history.
-- security invoker => RLS still applies; the explicit owner check gives a
-- clear error instead of silently updating nothing.
create or replace function public.undo_last_match(p_leaderboard_id uuid)
returns public.matches
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_match public.matches;
  v_elo1 integer;
  v_elo2 integer;
begin
  if not exists (
    select 1 from public.leaderboards
    where id = p_leaderboard_id and user_id = auth.uid()
  ) then
    raise exception 'Only the board owner can undo matches.' using errcode = '42501';
  end if;

  select * into v_match from public.matches
    where leaderboard_id = p_leaderboard_id
    order by created_at desc, id desc
    limit 1;

  if v_match.id is null then
    raise exception 'There are no matches to undo.' using errcode = 'P0002';
  end if;

  -- Lock both players, then make sure nothing has moved their ratings since
  -- this match (a concurrent undo or record would have).
  select elo into v_elo1 from public.players where id = v_match.player1_id for update;
  select elo into v_elo2 from public.players where id = v_match.player2_id for update;

  if v_elo1 is distinct from v_match.player1_elo_before + v_match.player1_change
     or v_elo2 is distinct from v_match.player2_elo_before + v_match.player2_change then
    raise exception 'Ratings changed since this match. Refresh and try again.' using errcode = '40001';
  end if;

  update public.players set elo = v_match.player1_elo_before where id = v_match.player1_id;
  update public.players set elo = v_match.player2_elo_before where id = v_match.player2_id;
  delete from public.matches where id = v_match.id;

  return v_match;
end;
$$;

grant execute on function public.undo_last_match(uuid) to authenticated;
