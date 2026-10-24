"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateShareCode } from "@/lib/codes";
import { usernameToEmail, normalizeUsername, isValidUsername } from "@/lib/auth";
import { calculateEloChange } from "@/lib/elo";
import type { Leaderboard, Match, Player, Profile } from "@/lib/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function signUp(username: string, password: string) {
  const normalized = normalizeUsername(username);
  if (!isValidUsername(normalized)) {
    return { error: "Username must be 3–20 characters (letters, numbers, underscore)." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const supabase = await createClient();
  const email = usernameToEmail(normalized);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username: normalized } },
  });

  if (error) return { error: error.message };
  if (!data.user) return { error: "Sign up failed." };

  const { error: profileError } = await supabase.from("profiles").insert({
    id: data.user.id,
    username: normalized,
  });

  if (profileError) {
    return { error: profileError.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function signIn(username: string, password: string) {
  const normalized = normalizeUsername(username);
  if (!isValidUsername(normalized)) {
    return { error: "Invalid username." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(normalized),
    password,
  });

  if (error) return { error: error.message };
  revalidatePath("/");
  return { success: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/");
  return { success: true };
}

export async function getSessionProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, profile };
}

export async function createLeaderboard(name: string, startingElo: number) {
  const { supabase, user } = await requireUser();
  const trimmed = name.trim();
  if (!trimmed) return { error: "Name is required." };
  if (startingElo < 100 || startingElo > 10000) {
    return { error: "Starting ELO must be between 100 and 10000." };
  }

  let shareCode = generateShareCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from("leaderboards")
      .insert({
        user_id: user.id,
        name: trimmed,
        share_code: shareCode,
        starting_elo: startingElo,
      })
      .select()
      .single();

    if (!error) {
      revalidatePath("/");
      return { leaderboard: data };
    }
    if (error.code === "23505") {
      shareCode = generateShareCode();
      continue;
    }
    return { error: error.message };
  }
  return { error: "Could not generate a unique share code." };
}

export async function deleteLeaderboard(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("leaderboards")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/");
  return { success: true };
}

export async function getMyLeaderboards() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("leaderboards")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message, leaderboards: [] };
  return { leaderboards: data ?? [] };
}

export async function getLeaderboardByCode(shareCode: string) {
  const supabase = await createClient();
  const { data: leaderboard, error } = await supabase
    .from("leaderboards")
    .select("*")
    .eq("share_code", shareCode.toUpperCase())
    .single();

  if (error || !leaderboard) return { error: "Leaderboard not found." };
  return { leaderboard };
}

export async function getPlayers(leaderboardId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("leaderboard_id", leaderboardId)
    .order("elo", { ascending: false });

  if (error) return { error: error.message, players: [] };
  return { players: data ?? [] };
}

export async function addPlayer(
  leaderboardId: string,
  name: string,
  username?: string
) {
  const { supabase, user } = await requireUser();
  const trimmed = name.trim();
  if (!trimmed) return { error: "Player name is required." };

  let linkedUserId: string | null = null;
  if (username?.trim()) {
    const found = await findProfileId(supabase, username);
    if ("error" in found) return { error: found.error };
    linkedUserId = found.id;
  }

  const { data: lb } = await supabase
    .from("leaderboards")
    .select("starting_elo")
    .eq("id", leaderboardId)
    .eq("user_id", user.id)
    .single();

  if (!lb) return { error: "Leaderboard not found." };

  const { data, error } = await supabase
    .from("players")
    .insert({
      leaderboard_id: leaderboardId,
      name: trimmed,
      elo: lb.starting_elo,
      user_id: linkedUserId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        error: linkedUserId
          ? "That name or account is already on this leaderboard."
          : "Player already exists.",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/");
  return { player: data };
}

export async function applyMatchToLeaderboard(
  leaderboardId: string,
  player1Id: string,
  player2Id: string,
  player1Score: number,
  player2Score: number
) {
  const { supabase, user } = await requireUser();

  if (player1Id === player2Id) {
    return { error: "Pick two different players." };
  }
  if (player1Score === player2Score) {
    return { error: "Tie game — no ELO change." };
  }

  const { data: lb } = await supabase
    .from("leaderboards")
    .select("id")
    .eq("id", leaderboardId)
    .eq("user_id", user.id)
    .single();

  if (!lb) return { error: "Leaderboard not found." };

  const { data: players, error: fetchError } = await supabase
    .from("players")
    .select("*")
    .eq("leaderboard_id", leaderboardId)
    .in("id", [player1Id, player2Id]);

  if (fetchError || !players || players.length !== 2) {
    return { error: "Could not find both players." };
  }

  const player1 = players.find((p) => p.id === player1Id);
  const player2 = players.find((p) => p.id === player2Id);
  if (!player1 || !player2) return { error: "Invalid match players." };

  const change = calculateEloChange(
    player1.elo,
    player2.elo,
    player1Score,
    player2Score
  );

  const { data: match, error: rpcError } = await supabase.rpc("record_match", {
    p_leaderboard_id: leaderboardId,
    p_player1_id: player1Id,
    p_player2_id: player2Id,
    p_player1_score: player1Score,
    p_player2_score: player2Score,
    p_player1_elo_before: player1.elo,
    p_player2_elo_before: player2.elo,
    p_player1_change: change.player1Change,
    p_player2_change: change.player2Change,
  });

  if (rpcError) {
    if (rpcError.code === "40001") {
      return { error: "Ratings changed while you were entering this match. Preview it again." };
    }
    if (rpcError.code === "PGRST202") {
      return { error: "Database is missing record_match(). Run supabase/migrations/002_accounts_and_stats.sql." };
    }
    return { error: rpcError.message };
  }

  revalidatePath("/");
  return { change, player1, player2, match: match as Match };
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

async function findProfileId(
  supabase: SupabaseServer,
  username: string
): Promise<{ id: string } | { error: string }> {
  const normalized = normalizeUsername(username);
  if (!isValidUsername(normalized)) return { error: "Invalid username." };
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", normalized)
    .maybeSingle();
  if (!data) return { error: `No account named "${normalized}".` };
  return { id: data.id as string };
}

/** Link (or unlink, with null) a player on one of your leaderboards to a user account. */
export async function linkPlayerToAccount(playerId: string, username: string | null) {
  const { supabase, user } = await requireUser();

  const { data: player } = await supabase
    .from("players")
    .select("id, leaderboard_id, leaderboards!inner(user_id)")
    .eq("id", playerId)
    .eq("leaderboards.user_id", user.id)
    .maybeSingle();
  if (!player) return { error: "Player not found." };

  let userId: string | null = null;
  if (username && username.trim()) {
    const found = await findProfileId(supabase, username);
    if ("error" in found) return { error: found.error };
    userId = found.id;
  }

  const { error } = await supabase
    .from("players")
    .update({ user_id: userId })
    .eq("id", playerId);

  if (error) {
    if (error.code === "23505") {
      return { error: "That account is already linked to another player on this board." };
    }
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

/** Leaderboards where the signed-in user is a linked player. */
export async function getBoardsIPlayIn() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { leaderboards: [] as Leaderboard[] };

  const { data } = await supabase
    .from("players")
    .select("leaderboards(*)")
    .eq("user_id", user.id);

  const leaderboards = (data ?? [])
    .map((row) => row.leaderboards as unknown as Leaderboard | null)
    .filter((lb): lb is Leaderboard => lb !== null);
  return { leaderboards };
}

/** Recent matches on a leaderboard, newest first. */
export async function getMatches(leaderboardId: string, limit = 200) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("leaderboard_id", leaderboardId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { error: error.message, matches: [] as Match[] };
  return { matches: (data ?? []) as Match[] };
}

/** Linked usernames keyed by user id. */
async function usernamesFor(supabase: SupabaseServer, userIds: string[]) {
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return new Map<string, string>();
  const { data } = await supabase.from("profiles").select("id, username").in("id", ids);
  return new Map((data ?? []).map((p) => [p.id as string, p.username as string]));
}

/** Everything the player page needs: the player, their board, their matches and opponents. */
export async function getPlayerDetail(playerId: string) {
  const supabase = await createClient();

  const { data: player } = await supabase
    .from("players")
    .select("*")
    .eq("id", playerId)
    .maybeSingle();
  if (!player) return { error: "Player not found." as const };

  const [{ data: leaderboard }, { data: matches }, { data: boardPlayers }] =
    await Promise.all([
      supabase.from("leaderboards").select("*").eq("id", player.leaderboard_id).single(),
      supabase
        .from("matches")
        .select("*")
        .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
        .order("created_at", { ascending: true }),
      supabase
        .from("players")
        .select("*")
        .eq("leaderboard_id", player.leaderboard_id)
        .order("elo", { ascending: false }),
    ]);

  const players = (boardPlayers ?? []) as Player[];
  const usernames = await usernamesFor(
    supabase,
    players.map((p) => p.user_id).filter((id): id is string => !!id)
  );

  return {
    player: player as Player,
    leaderboard: leaderboard as Leaderboard,
    matches: (matches ?? []) as Match[],
    players,
    rank: players.findIndex((p) => p.id === playerId) + 1,
    username: player.user_id ? usernames.get(player.user_id) ?? null : null,
    usernames: Object.fromEntries(usernames),
  };
}

/** Public profile: every player slot linked to this account, across leaderboards. */
export async function getProfileDetail(username: string) {
  const supabase = await createClient();
  const normalized = normalizeUsername(username);

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", normalized)
    .maybeSingle();
  if (!profile) return { error: "User not found." as const };

  const { data: slots } = await supabase
    .from("players")
    .select("*, leaderboards(*)")
    .eq("user_id", profile.id);

  const players = (slots ?? []).map((row) => {
    const { leaderboards, ...p } = row as Player & { leaderboards: Leaderboard };
    return { player: p as Player, leaderboard: leaderboards };
  });

  const ids = players.map((s) => s.player.id);
  let matches: Match[] = [];
  let opponents: Player[] = [];
  if (ids.length > 0) {
    const list = ids.join(",");
    const { data } = await supabase
      .from("matches")
      .select("*")
      .or(`player1_id.in.(${list}),player2_id.in.(${list})`)
      .order("created_at", { ascending: true });
    matches = (data ?? []) as Match[];

    const opponentIds = [
      ...new Set(matches.flatMap((m) => [m.player1_id, m.player2_id])),
    ].filter((id) => !ids.includes(id));
    if (opponentIds.length > 0) {
      const { data: opp } = await supabase.from("players").select("*").in("id", opponentIds);
      opponents = (opp ?? []) as Player[];
    }
  }

  return { profile: profile as Profile, players, matches, opponents };
}
