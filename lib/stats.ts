import type { Match } from "@/lib/types";

export type MatchResult = "W" | "L";

/** One match seen from a single player's side. */
export type PlayerMatch = {
  id: string;
  leaderboardId: string;
  playedAt: string;
  opponentId: string;
  result: MatchResult;
  pointsFor: number;
  pointsAgainst: number;
  eloBefore: number;
  eloAfter: number;
  change: number;
};

export type Streak = { result: MatchResult; count: number } | null;

export type PlayerStats = {
  played: number;
  wins: number;
  losses: number;
  /** 0–1, null when no matches. */
  winRate: number | null;
  /** wins / losses; equals wins when there are no losses; null when no matches. */
  winLossRatio: number | null;
  currentStreak: Streak;
  longestWinStreak: number;
  peakElo: number | null;
  pointsFor: number;
  pointsAgainst: number;
  avgPointsFor: number | null;
  avgPointsAgainst: number | null;
  biggestWin: PlayerMatch | null;
  /** Most recent first, up to 5. */
  form: MatchResult[];
};

export type HeadToHead = {
  opponentId: string;
  wins: number;
  losses: number;
  played: number;
};

export function toPlayerMatch(match: Match, playerId: string): PlayerMatch | null {
  const isP1 = match.player1_id === playerId;
  if (!isP1 && match.player2_id !== playerId) return null;

  const pointsFor = isP1 ? match.player1_score : match.player2_score;
  const pointsAgainst = isP1 ? match.player2_score : match.player1_score;
  const eloBefore = isP1 ? match.player1_elo_before : match.player2_elo_before;
  const change = isP1 ? match.player1_change : match.player2_change;

  return {
    id: match.id,
    leaderboardId: match.leaderboard_id,
    playedAt: match.created_at,
    opponentId: isP1 ? match.player2_id : match.player1_id,
    result: pointsFor > pointsAgainst ? "W" : "L",
    pointsFor,
    pointsAgainst,
    eloBefore,
    eloAfter: eloBefore + change,
    change,
  };
}

/** Matches for one player, oldest first. */
export function playerMatches(matches: Match[], playerId: string): PlayerMatch[] {
  return matches
    .map((m) => toPlayerMatch(m, playerId))
    .filter((m): m is PlayerMatch => m !== null)
    .sort((a, b) => a.playedAt.localeCompare(b.playedAt));
}

/** Stats from a player's matches (any order; sorted internally). */
export function computeStats(history: PlayerMatch[], currentElo?: number): PlayerStats {
  const ordered = [...history].sort((a, b) => a.playedAt.localeCompare(b.playedAt));

  let wins = 0;
  let losses = 0;
  let pointsFor = 0;
  let pointsAgainst = 0;
  let longestWinStreak = 0;
  let run = 0;
  let peakElo: number | null = currentElo ?? null;
  let biggestWin: PlayerMatch | null = null;

  for (const m of ordered) {
    pointsFor += m.pointsFor;
    pointsAgainst += m.pointsAgainst;
    peakElo = Math.max(peakElo ?? m.eloBefore, m.eloBefore, m.eloAfter);

    if (m.result === "W") {
      wins++;
      run++;
      longestWinStreak = Math.max(longestWinStreak, run);
      const margin = m.pointsFor - m.pointsAgainst;
      if (!biggestWin || margin > biggestWin.pointsFor - biggestWin.pointsAgainst) {
        biggestWin = m;
      }
    } else {
      losses++;
      run = 0;
    }
  }

  const played = wins + losses;

  let currentStreak: Streak = null;
  for (let i = ordered.length - 1; i >= 0; i--) {
    const r = ordered[i]!.result;
    if (!currentStreak) currentStreak = { result: r, count: 1 };
    else if (currentStreak.result === r) currentStreak.count++;
    else break;
  }

  return {
    played,
    wins,
    losses,
    winRate: played ? wins / played : null,
    winLossRatio: played ? (losses ? wins / losses : wins) : null,
    currentStreak,
    longestWinStreak,
    peakElo,
    pointsFor,
    pointsAgainst,
    avgPointsFor: played ? pointsFor / played : null,
    avgPointsAgainst: played ? pointsAgainst / played : null,
    biggestWin,
    form: ordered.slice(-5).reverse().map((m) => m.result),
  };
}

/** Record against each opponent, most-played first. */
export function headToHead(history: PlayerMatch[]): HeadToHead[] {
  const byOpponent = new Map<string, HeadToHead>();
  for (const m of history) {
    const row = byOpponent.get(m.opponentId) ?? {
      opponentId: m.opponentId,
      wins: 0,
      losses: 0,
      played: 0,
    };
    row.played++;
    if (m.result === "W") row.wins++;
    else row.losses++;
    byOpponent.set(m.opponentId, row);
  }
  return [...byOpponent.values()].sort((a, b) => b.played - a.played);
}

/** Rating after each match, oldest first, starting from the rating before the first match. */
export function eloSeries(history: PlayerMatch[]): number[] {
  const ordered = [...history].sort((a, b) => a.playedAt.localeCompare(b.playedAt));
  if (ordered.length === 0) return [];
  return [ordered[0]!.eloBefore, ...ordered.map((m) => m.eloAfter)];
}

/** Wins and losses per player id across a set of matches. */
export function recordsByPlayer(matches: Match[]): Map<string, { wins: number; losses: number }> {
  const records = new Map<string, { wins: number; losses: number }>();
  const bump = (id: string, won: boolean) => {
    const r = records.get(id) ?? { wins: 0, losses: 0 };
    if (won) r.wins++;
    else r.losses++;
    records.set(id, r);
  };
  for (const m of matches) {
    const p1Won = m.player1_score > m.player2_score;
    bump(m.player1_id, p1Won);
    bump(m.player2_id, !p1Won);
  }
  return records;
}

export function formatWinRate(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

export function formatRatio(ratio: number | null): string {
  return ratio === null ? "—" : ratio.toFixed(2);
}
