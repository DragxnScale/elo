export type EloParams = {
  k?: number;
  minWinGain?: number;
  loserLossRate?: number;
  upsetScale?: number;
  scoreScale?: number;
  scorePower?: number;
  maxScoreMultiplier?: number;
};

export type EloChangeResult = {
  winnerGain: number;
  loserLoss: number;
  player1Change: number;
  player2Change: number;
  player1NewElo: number;
  player2NewElo: number;
  scoreMultiplier: number;
  upsetMultiplier: number;
  expectedScore: number;
};

export function calculateEloChange(
  player1Elo: number,
  player2Elo: number,
  player1Score: number,
  player2Score: number,
  {
    k = 32,
    minWinGain = 40,
    loserLossRate = 0.75,
    upsetScale = 250,
    scoreScale = 25,
    scorePower = 0.75,
    maxScoreMultiplier = 10,
  }: EloParams = {}
): EloChangeResult {
  if (player1Score === player2Score) {
    return {
      player1Change: 0,
      player2Change: 0,
      player1NewElo: player1Elo,
      player2NewElo: player2Elo,
      winnerGain: 0,
      loserLoss: 0,
      scoreMultiplier: 1,
      upsetMultiplier: 1,
      expectedScore: 0.5,
    };
  }

  const player1Won = player1Score > player2Score;

  const winnerElo = player1Won ? player1Elo : player2Elo;
  const loserElo = player1Won ? player2Elo : player1Elo;

  const expectedScore =
    1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));

  const baseChange = k * (1 - expectedScore);

  const upsetMultiplier =
    1 + Math.max(0, loserElo - winnerElo) / upsetScale;

  const scoreMargin = Math.abs(player1Score - player2Score);

  const scoreMultiplier = Math.min(
    maxScoreMultiplier,
    1 + Math.pow(scoreMargin / scoreScale, scorePower)
  );

  const winnerGain = Math.round(
    Math.max(minWinGain, baseChange) * upsetMultiplier * scoreMultiplier
  );

  const loserLoss = Math.round(winnerGain * loserLossRate);

  const player1Change = player1Won ? winnerGain : -loserLoss;
  const player2Change = player1Won ? -loserLoss : winnerGain;

  return {
    winnerGain,
    loserLoss,
    player1Change,
    player2Change,
    player1NewElo: player1Elo + player1Change,
    player2NewElo: player2Elo + player2Change,
    scoreMultiplier,
    upsetMultiplier,
    expectedScore,
  };
}
