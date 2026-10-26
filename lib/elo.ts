/**
 * Kleos rating formula. supabase/migrations/005_elo_v2_ties.sql has an exact
 * SQL copy (elo_change) that the database uses when recording a match; keep
 * the two in step (lib/elo.test.ts pins the behaviour).
 *
 * Ratings move by how a result compares with what the ratings predicted:
 *
 * 1. Expected share of the points: E1 = 1 / (1 + 10^((R2 - R1) / 400)),
 *    E2 = 1 - E1. Equal ratings expect a 50/50 game; a big favourite is
 *    expected to take nearly every point.
 * 2. Actual share of the points: A1 = 1/2 + 1/2 * (s1 - s2) / (|s1| + |s2|).
 *    A shutout is 1, a tie is 1/2, and it works with negative scores.
 * 3. Factor: K = 200 + 0.1 * |R1 - R2|, so the bigger the gap, the bigger
 *    the stakes. Swing = K * (A1 - E1).
 * 4. Whoever did better than expected gains |swing|; the other side loses
 *    x0.75 of it, shrinking further with experience (x1.0 for a newcomer down
 *    to x0.6 after 50 games). A favourite who wins by less than expected
 *    loses rating; an underdog who loses narrowly gains.
 * 5. Ratings only go up overall: whoever gains always gains at least 1 more
 *    than the other player loses.
 */

export type EloParams = {
  /** Base factor: the swing between equal ratings for a shutout is K/2. */
  k?: number;
  /** Added to K per point of rating gap. */
  kPerGap?: number;
  /** Losses are this share of the matching gain. */
  lossRate?: number;
  /** Losses shrink by up to this share... */
  experienceCushion?: number;
  /** ...reached after this many games. */
  experienceGames?: number;
};

export const ELO_DEFAULTS: Required<EloParams> = {
  k: 200,
  kPerGap: 0.1,
  lossRate: 0.75,
  experienceCushion: 0.4,
  experienceGames: 50,
};

export type MatchOutcome = "player1" | "player2" | "tie";

export type EloChangeResult = {
  /** Who won on the scoreboard (ratings can move the other way). */
  outcome: MatchOutcome;
  player1Change: number;
  player2Change: number;
  player1NewElo: number;
  player2NewElo: number;
  /** Player 1's expected share of the points, 0-1. */
  expectedScore: number;
  /** Player 1's actual share of the points, 0-1. */
  actualScore: number;
  /** The factor used: base K plus the rating-gap part. */
  k: number;
  /** Loss multiplier from experience for each player (1 = no cushion). */
  player1Cushion: number;
  player2Cushion: number;
};

/** JavaScript's Math.round, spelled out so the SQL copy can match it exactly. */
function roundHalfUp(x: number): number {
  return Math.floor(x + 0.5);
}

/** Loss multiplier for a player with this many games played before the match. */
export function experienceCushion(gamesPlayed: number, params: EloParams = {}): number {
  const { experienceCushion: max, experienceGames } = { ...ELO_DEFAULTS, ...params };
  const games = Math.max(0, gamesPlayed);
  return 1 - (max * Math.min(games, experienceGames)) / experienceGames;
}

/** Player 1's share of the points, 0-1: shutout 1, tie 1/2. Handles negatives. */
export function pointsShare(player1Score: number, player2Score: number): number {
  const spread = Math.abs(player1Score) + Math.abs(player2Score);
  if (spread === 0) return 0.5;
  return 0.5 + (0.5 * (player1Score - player2Score)) / spread;
}

export function calculateEloChange(
  player1Elo: number,
  player2Elo: number,
  player1Score: number,
  player2Score: number,
  games: { player1: number; player2: number } = { player1: 0, player2: 0 },
  params: EloParams = {}
): EloChangeResult {
  const { k: baseK, kPerGap, lossRate } = { ...ELO_DEFAULTS, ...params };

  const expected1 = 1 / (1 + Math.pow(10, (player2Elo - player1Elo) / 400));
  const actual1 = pointsShare(player1Score, player2Score);
  const k = baseK + kPerGap * Math.abs(player1Elo - player2Elo);

  const cushion1 = experienceCushion(games.player1, params);
  const cushion2 = experienceCushion(games.player2, params);

  // Positive: player 1 beat expectations. Negative: player 2 did.
  const swing = k * (actual1 - expected1);
  const size = Math.abs(swing);
  const loserCushion = swing > 0 ? cushion2 : cushion1;

  const gain = roundHalfUp(size);
  let loss = roundHalfUp(size * lossRate * loserCushion);
  if (gain > 0) loss = Math.min(loss, gain - 1);
  const lost = loss === 0 ? 0 : -loss;

  let player1Change = 0;
  let player2Change = 0;
  if (swing > 0) {
    player1Change = gain;
    player2Change = lost;
  } else if (swing < 0) {
    player1Change = lost;
    player2Change = gain;
  }

  return {
    outcome:
      player1Score > player2Score ? "player1" : player1Score < player2Score ? "player2" : "tie",
    player1Change,
    player2Change,
    player1NewElo: player1Elo + player1Change,
    player2NewElo: player2Elo + player2Change,
    expectedScore: expected1,
    actualScore: actual1,
    k,
    player1Cushion: cushion1,
    player2Cushion: cushion2,
  };
}
