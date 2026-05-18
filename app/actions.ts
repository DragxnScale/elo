"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateShareCode } from "@/lib/codes";
import { usernameToEmail, normalizeUsername, isValidUsername } from "@/lib/auth";
import { calculateEloChange } from "@/lib/elo";

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

export async function addPlayer(leaderboardId: string, name: string) {
  const { supabase, user } = await requireUser();
  const trimmed = name.trim();
  if (!trimmed) return { error: "Player name is required." };

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
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return { error: "Player already exists." };
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

  const [p1Res, p2Res] = await Promise.all([
    supabase
      .from("players")
      .update({ elo: change.player1NewElo })
      .eq("id", player1Id),
    supabase
      .from("players")
      .update({ elo: change.player2NewElo })
      .eq("id", player2Id),
  ]);

  if (p1Res.error || p2Res.error) {
    return { error: p1Res.error?.message ?? p2Res.error?.message };
  }

  revalidatePath("/");
  return { change, player1, player2 };
}
