-- Members, admins and joining by code.
-- Run once in the Supabase SQL Editor (after 003_undo_last_match.sql).
-- Safe to re-run.
--
-- Roles on a board:
--   owner  - created the board (leaderboards.user_id). Everything.
--   admin  - a member the owner promoted. Records and undoes matches, adds
--            players, removes regular players.
--   player - everyone else on the board.
-- Owner-only: promote/demote admins, remove admins, restore removed players,
-- set a player's rating, link accounts, delete the board.
--
-- Every write that admins (or joining players) make goes through a
-- security definer function below that checks the caller's role itself, so
-- the table policies can stay owner-only.

-- 1. Membership fields on players.
alter table public.players
  add column if not exists role text not null default 'player';
alter table public.players
  add column if not exists status text not null default 'active';

do $$
begin
  alter table public.players add constraint players_role_check
    check (role in ('player', 'admin'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.players add constraint players_status_check
    check (status in ('active', 'left', 'removed'));
exception when duplicate_object then null;
end $$;

-- 2. Audit trail for manual rating changes.
create table if not exists public.rating_adjustments (
  id uuid primary key default gen_random_uuid(),
  leaderboard_id uuid not null references public.leaderboards (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  elo_before integer not null,
  elo_after integer not null,
  reason text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists rating_adjustments_player_idx
  on public.rating_adjustments (player_id, created_at desc);

alter table public.rating_adjustments enable row level security;

drop policy if exists "Anyone can view rating adjustments" on public.rating_adjustments;
create policy "Anyone can view rating adjustments"
  on public.rating_adjustments for select
  using (true);

-- 3. The caller's role on a board: 'owner', 'admin' or null.
create or replace function public.board_role(p_leaderboard_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then null
    when exists (
      select 1 from public.leaderboards
      where id = p_leaderboard_id and user_id = auth.uid()
    ) then 'owner'
    when exists (
      select 1 from public.players
      where leaderboard_id = p_leaderboard_id
        and user_id = auth.uid()
        and role = 'admin'
        and status = 'active'
    ) then 'admin'
    else null
  end;
$$;

grant execute on function public.board_role(uuid) to anon, authenticated;

-- 4a. The rating change for a match, computed exactly as lib/elo.ts
--     calculateEloChange does (same constants; JavaScript's Math.round is
--     floor(x + 0.5)). The database uses this rather than trusting a change
--     sent by the app.
create or replace function public.elo_change(
  p_elo1 integer,
  p_elo2 integer,
  p_score1 integer,
  p_score2 integer,
  out change1 integer,
  out change2 integer
)
language plpgsql
immutable
set search_path = public
as $$
declare
  v_winner integer;
  v_loser integer;
  v_expected double precision;
  v_base double precision;
  v_upset double precision;
  v_margin double precision;
  v_gain integer;
  v_loss integer;
begin
  if p_score1 = p_score2 then
    change1 := 0;
    change2 := 0;
    return;
  end if;

  if p_score1 > p_score2 then
    v_winner := p_elo1; v_loser := p_elo2;
  else
    v_winner := p_elo2; v_loser := p_elo1;
  end if;

  v_expected := 1.0 / (1.0 + power(10.0::double precision, (v_loser - v_winner)::double precision / 400.0));
  v_base := 32.0 * (1.0 - v_expected);
  v_upset := 1.0 + greatest(0, v_loser - v_winner)::double precision / 250.0;
  v_margin := least(10.0, 1.0 + power(abs(p_score1 - p_score2)::double precision / 25.0, 0.75));
  v_gain := floor(greatest(40.0, v_base) * v_upset * v_margin + 0.5)::integer;
  v_loss := floor(v_gain * 0.75 + 0.5)::integer;

  if p_score1 > p_score2 then
    change1 := v_gain; change2 := -v_loss;
  else
    change1 := -v_loss; change2 := v_gain;
  end if;
end;
$$;

-- 4b. Record a match: owner or admin. Same signature as 002 so the app keeps
--     working, but the change arguments are now ignored: the change is
--     computed here from the locked ratings and the scores.
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
  v_change1 integer;
  v_change2 integer;
  v_match public.matches;
begin
  if public.board_role(p_leaderboard_id) is null then
    raise exception 'Only the board owner or an admin can record matches.' using errcode = '42501';
  end if;

  if p_player1_id = p_player2_id or p_player1_score = p_player2_score then
    raise exception 'A match needs two different players and a winner.' using errcode = '22023';
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

  select change1, change2 into v_change1, v_change2
    from public.elo_change(v_elo1, v_elo2, p_player1_score, p_player2_score);

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

-- 5. Undo the newest match: owner or admin (was owner-only in 003).
create or replace function public.undo_last_match(p_leaderboard_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches;
  v_elo1 integer;
  v_elo2 integer;
begin
  if public.board_role(p_leaderboard_id) is null then
    raise exception 'Only the board owner or an admin can undo matches.' using errcode = '42501';
  end if;

  select * into v_match from public.matches
    where leaderboard_id = p_leaderboard_id
    order by created_at desc, id desc
    limit 1;

  if v_match.id is null then
    raise exception 'There are no matches to undo.' using errcode = 'P0002';
  end if;

  select elo into v_elo1 from public.players
    where id = v_match.player1_id and leaderboard_id = p_leaderboard_id for update;
  select elo into v_elo2 from public.players
    where id = v_match.player2_id and leaderboard_id = p_leaderboard_id for update;

  if v_elo1 is null or v_elo2 is null then
    raise exception 'That match has players from another board.' using errcode = '22023';
  end if;

  if v_elo1 is distinct from v_match.player1_elo_before + v_match.player1_change
     or v_elo2 is distinct from v_match.player2_elo_before + v_match.player2_change then
    raise exception 'Ratings changed since this match. Refresh and try again.' using errcode = '40001';
  end if;

  update public.players set elo = v_match.player1_elo_before
    where id = v_match.player1_id and leaderboard_id = p_leaderboard_id;
  update public.players set elo = v_match.player2_elo_before
    where id = v_match.player2_id and leaderboard_id = p_leaderboard_id;
  delete from public.matches where id = v_match.id;

  return v_match;
end;
$$;

-- 6. Add a player (owner or admin). Linking it to an account: owner only.
create or replace function public.add_player(
  p_leaderboard_id uuid,
  p_name text,
  p_username text default null
)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  v_starting integer;
  v_user uuid;
  v_player public.players;
begin
  if public.board_role(p_leaderboard_id) is null then
    raise exception 'Only the board owner or an admin can add players.' using errcode = '42501';
  end if;

  if coalesce(btrim(p_name), '') = '' then
    raise exception 'Player name is required.' using errcode = '22023';
  end if;

  select starting_elo into v_starting from public.leaderboards where id = p_leaderboard_id;

  if coalesce(btrim(p_username), '') <> '' then
    if public.board_role(p_leaderboard_id) <> 'owner' then
      raise exception 'Only the board owner can link accounts.' using errcode = '42501';
    end if;
    select id into v_user from public.profiles where username = lower(btrim(p_username));
    if v_user is null then
      raise exception 'No account named "%".', lower(btrim(p_username)) using errcode = 'P0002';
    end if;
  end if;

  insert into public.players (leaderboard_id, name, elo, user_id)
  values (p_leaderboard_id, btrim(p_name), v_starting, v_user)
  returning * into v_player;

  return v_player;
end;
$$;

-- 7. Join a board by its share code. Adds the caller as a player linked to
--    their account at the board's starting rating. Returns what happened:
--    'joined', 'rejoined' (had left; same rating and history) or 'member'.
--    Players the owner or an admin removed cannot rejoin.
create or replace function public.join_board(p_share_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_board public.leaderboards;
  v_player public.players;
  v_username text;
  v_name text;
  v_n integer := 1;
begin
  if auth.uid() is null then
    raise exception 'Sign in to join this board.' using errcode = '42501';
  end if;

  select * into v_board from public.leaderboards
    where share_code = upper(btrim(p_share_code));
  if v_board.id is null then
    raise exception 'Leaderboard not found.' using errcode = 'P0002';
  end if;

  select * into v_player from public.players
    where leaderboard_id = v_board.id and user_id = auth.uid();

  if v_player.id is not null then
    if v_player.status = 'removed' then
      raise exception 'You were removed from this board. Ask the owner to add you back.' using errcode = '42501';
    end if;
    if v_player.status = 'left' then
      update public.players set status = 'active' where id = v_player.id;
      return jsonb_build_object('status', 'rejoined', 'player_id', v_player.id, 'leaderboard_id', v_board.id);
    end if;
    return jsonb_build_object('status', 'member', 'player_id', v_player.id, 'leaderboard_id', v_board.id);
  end if;

  select username into v_username from public.profiles where id = auth.uid();
  if v_username is null then
    raise exception 'Your account has no username yet. Sign out and in again.' using errcode = 'P0002';
  end if;

  -- Use the username as the player name; add " 2", " 3"... if it is taken.
  v_name := v_username;
  while exists (
    select 1 from public.players
    where leaderboard_id = v_board.id and lower(name) = lower(v_name)
  ) loop
    v_n := v_n + 1;
    v_name := v_username || ' ' || v_n;
  end loop;

  insert into public.players (leaderboard_id, name, elo, user_id)
  values (v_board.id, v_name, v_board.starting_elo, auth.uid())
  returning * into v_player;

  return jsonb_build_object('status', 'joined', 'player_id', v_player.id, 'leaderboard_id', v_board.id);
end;
$$;

-- 8. Leave a board yourself. Your rating and history stay; joining again
--    with the code brings them back. Admins lose admin on leaving.
create or replace function public.leave_board(p_leaderboard_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;

  update public.players
    set status = 'left', role = 'player'
    where leaderboard_id = p_leaderboard_id
      and user_id = auth.uid()
      and status = 'active';

  if not found then
    raise exception 'You are not on this board.' using errcode = 'P0002';
  end if;
end;
$$;

-- 9. Make a member an admin, or back to a player: owner only.
create or replace function public.set_player_role(p_player_id uuid, p_role text)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players;
begin
  if p_role not in ('player', 'admin') then
    raise exception 'Role must be player or admin.' using errcode = '22023';
  end if;

  select * into v_player from public.players where id = p_player_id;
  if v_player.id is null then
    raise exception 'Player not found.' using errcode = 'P0002';
  end if;

  if public.board_role(v_player.leaderboard_id) is distinct from 'owner' then
    raise exception 'Only the board owner can change admins.' using errcode = '42501';
  end if;

  if p_role = 'admin' and v_player.user_id is null then
    raise exception 'Only players linked to an account can be admins.' using errcode = '22023';
  end if;

  if v_player.status <> 'active' then
    raise exception 'That player is not on the board.' using errcode = '22023';
  end if;

  update public.players set role = p_role where id = p_player_id
    returning * into v_player;
  return v_player;
end;
$$;

-- 10. Remove (kick) a player. Owner: anyone. Admin: regular players only.
--     Their matches stay in everyone's history; they disappear from the
--     rankings and cannot rejoin by code until the owner restores them.
create or replace function public.remove_player(p_player_id uuid)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players;
  v_role text;
begin
  select * into v_player from public.players where id = p_player_id;
  if v_player.id is null then
    raise exception 'Player not found.' using errcode = 'P0002';
  end if;

  v_role := public.board_role(v_player.leaderboard_id);
  if v_role is null then
    raise exception 'Only the board owner or an admin can remove players.' using errcode = '42501';
  end if;

  if v_role = 'admin' and (
    v_player.role = 'admin'
    or v_player.user_id = auth.uid()
    or v_player.user_id = (select user_id from public.leaderboards where id = v_player.leaderboard_id)
  ) then
    raise exception 'Admins can only remove regular players.' using errcode = '42501';
  end if;

  update public.players set status = 'removed', role = 'player' where id = p_player_id
    returning * into v_player;
  return v_player;
end;
$$;

-- 11. Put a removed (or departed) player back on the board: owner only.
create or replace function public.restore_player(p_player_id uuid)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players;
begin
  select * into v_player from public.players where id = p_player_id;
  if v_player.id is null then
    raise exception 'Player not found.' using errcode = 'P0002';
  end if;

  if public.board_role(v_player.leaderboard_id) is distinct from 'owner' then
    raise exception 'Only the board owner can restore players.' using errcode = '42501';
  end if;

  update public.players set status = 'active' where id = p_player_id
    returning * into v_player;
  return v_player;
end;
$$;

-- 12. Set a player's rating by hand: owner only. Logged in
--     rating_adjustments with an optional reason.
create or replace function public.adjust_rating(
  p_player_id uuid,
  p_new_elo integer,
  p_reason text default null
)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players;
begin
  if p_new_elo < 0 or p_new_elo > 100000 then
    raise exception 'Rating must be between 0 and 100000.' using errcode = '22023';
  end if;

  select * into v_player from public.players where id = p_player_id for update;
  if v_player.id is null then
    raise exception 'Player not found.' using errcode = 'P0002';
  end if;

  if public.board_role(v_player.leaderboard_id) is distinct from 'owner' then
    raise exception 'Only the board owner can change ratings by hand.' using errcode = '42501';
  end if;

  insert into public.rating_adjustments (
    leaderboard_id, player_id, elo_before, elo_after, reason, created_by
  ) values (
    v_player.leaderboard_id, v_player.id, v_player.elo, p_new_elo,
    nullif(btrim(p_reason), ''), auth.uid()
  );

  update public.players set elo = p_new_elo where id = p_player_id
    returning * into v_player;
  return v_player;
end;
$$;

grant execute on function public.add_player(uuid, text, text) to authenticated;
grant execute on function public.join_board(text) to authenticated;
grant execute on function public.leave_board(uuid) to authenticated;
grant execute on function public.set_player_role(uuid, text) to authenticated;
grant execute on function public.remove_player(uuid) to authenticated;
grant execute on function public.restore_player(uuid) to authenticated;
grant execute on function public.adjust_rating(uuid, integer, text) to authenticated;

-- Definer functions must not be callable by signed-out visitors.
revoke execute on function public.record_match(
  uuid, uuid, uuid, integer, integer, integer, integer, integer, integer
) from public, anon;
revoke execute on function public.undo_last_match(uuid) from public, anon;
revoke execute on function public.add_player(uuid, text, text) from public, anon;
revoke execute on function public.join_board(text) from public, anon;
revoke execute on function public.leave_board(uuid) from public, anon;
revoke execute on function public.set_player_role(uuid, text) from public, anon;
revoke execute on function public.remove_player(uuid) from public, anon;
revoke execute on function public.restore_player(uuid) from public, anon;
revoke execute on function public.adjust_rating(uuid, integer, text) from public, anon;
grant execute on function public.record_match(
  uuid, uuid, uuid, integer, integer, integer, integer, integer, integer
) to authenticated;
grant execute on function public.undo_last_match(uuid) to authenticated;

-- 13. Lock down direct writes. Ratings and matches change only through the
--     functions above (which check roles, keep players on their own board
--     and log manual changes). Owners keep direct updates to names, account
--     links, roles and status, which the app uses for linking accounts.
drop policy if exists "Owners record matches" on public.matches;
revoke insert, update on public.matches from anon, authenticated;
revoke insert, update on public.players from anon, authenticated;
grant update (name, user_id, role, status) on public.players to authenticated;
revoke insert, update, delete on public.rating_adjustments from anon, authenticated;

-- 14. A match's players must belong to the match's board. Added NOT VALID so
--     it can't fail on existing rows; validated when the existing data allows.
do $$
begin
  alter table public.players add constraint players_id_leaderboard_key unique (id, leaderboard_id);
exception when duplicate_table or duplicate_object then null;
end $$;

do $$
begin
  alter table public.matches add constraint matches_player1_same_board
    foreign key (player1_id, leaderboard_id) references public.players (id, leaderboard_id)
    on delete cascade not valid;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.matches add constraint matches_player2_same_board
    foreign key (player2_id, leaderboard_id) references public.players (id, leaderboard_id)
    on delete cascade not valid;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.matches validate constraint matches_player1_same_board;
  alter table public.matches validate constraint matches_player2_same_board;
exception when foreign_key_violation then
  raise notice 'Some existing matches reference players from another board; new matches are still checked.';
end $$;
