/**
 * Kleos rating formula. supabase/migrations/005_elo_v2_ties.sql has an exact
 * SQL copy (elo_change) that the database uses when recording a match; keep
 * the two in step (lib/elo.test.ts pins the behaviour).
 *
 * 1. Rating gap: standard ELO expectation. The favourite is expected to score
 *    E = 1 / (1 + 10^((theirs - yours) / 400)); a result moves ratings by
 *    K * (actual - expected). Beating someone far weaker earns almost nothing,
 *    an upset earns up to K, and a tie moves points toward the underdog.
 * 2. Score margin: a bigger win (or loss) scales the swing, up to x3.
 * 3. Cushioning: losses are smaller than gains (x0.75), and shrink further
 *    with experience, from x1.0 for a newcomer to x0.6 after 50 games.
 *    Gains are never cushioned.
 */

export type EloParams = {
  /** Most a result can move a rating, before the score margin. */
  k?: number;
  /** Losses are this share of the matching gain. */
  lossRate?: number;
  scoreScale?: number;
  scorePower?: number;
  maxScoreMultiplier?: number;
  /** Losses shrink by up to this share... */
  experienceCushion?: number;
  /** ...reached after this many games. */
  experienceGames?: number;
};

export const ELO_DEFAULTS: Required<EloParams> = {
  k: 80,
  lossRate: 0.75,
  scoreScale: 25,
  scorePower: 0.75,
  maxScoreMultiplier: 3,
  experienceCushion: 0.4,
  experienceGames: 50,
};

export type MatchOutcome = "player1" | "player2" | "tie";

export type EloChangeResult = {
  outcome: MatchOutcome;
  player1Change: number;
  player2Change: number;
  player1NewElo: number;
  player2NewElo: number;
  /** Player 1's expected score, 0-1 (their chance of winning, roughly). */
  expectedScore: number;
  scoreMultiplier: number;
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

export function calculateEloChange(
  player1Elo: number,
  player2Elo: number,
  player1Score: number,
  player2Score: number,
  games: { player1: number; player2: number } = { player1: 0, player2: 0 },
  params: EloParams = {}
): EloChangeResult {
  const { k, lossRate, scoreScale, scorePower, maxScoreMultiplier } = {
    ...ELO_DEFAULTS,
    ...params,
  };

  const expected1 = 1 / (1 + Math.pow(10, (player2Elo - player1Elo) / 400));
  const actual1 = player1Score > player2Score ? 1 : player1Score < player2Score ? 0 : 0.5;
  const margin = Math.abs(player1Score - player2Score);
  const scoreMultiplier = Math.min(
    maxScoreMultiplier,
    1 + Math.pow(margin / scoreScale, scorePower)
  );

  const cushion1 = experienceCushion(games.player1, params);
  const cushion2 = experienceCushion(games.player2, params);

  // Player 1's raw swing; player 2's is the opposite.
  const raw1 = k * (actual1 - expected1) * scoreMultiplier;
  const raw2 = -raw1;
  const settle = (raw: number, cushion: number) =>
    raw >= 0 ? roundHalfUp(raw) : roundHalfUp(raw * lossRate * cushion);

  const player1Change = settle(raw1, cushion1);
  const player2Change = settle(raw2, cushion2);

  return {
    outcome: actual1 === 1 ? "player1" : actual1 === 0 ? "player2" : "tie",
    player1Change,
    player2Change,
    player1NewElo: player1Elo + player1Change,
    player2NewElo: player2Elo + player2Change,
    expectedScore: expected1,
    scoreMultiplier,
    player1Cushion: cushion1,
    player2Cushion: cushion2,
  };
}
