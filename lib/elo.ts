/** Flat points added to every rating change. */
const BASE_POINTS = 10;

/** Percent of a player's own ELO (5 = 5%, so +500 per 10,000 ELO before rounding). */
const ELO_PERCENT = 5;

export type EloChange = {
  winnerGain: number;
  loserLoss: number;
  winnerNewElo: number;
  loserNewElo: number;
};

function pointsFromElo(elo: number): number {
  return BASE_POINTS + (elo * ELO_PERCENT) / 100;
}

export function calculateEloChange(
  winnerElo: number,
  loserElo: number
): Pick<EloChange, "winnerGain" | "loserLoss"> {
  let winnerGain = pointsFromElo(winnerElo);
  let loserLoss = pointsFromElo(loserElo);

  const ratingGap = loserElo - winnerElo;
  const avgElo = (winnerElo + loserElo) / 2;

  if (ratingGap > 0 && avgElo > 0) {
    const upsetMultiplier = 1 + (ratingGap / avgElo) * 2;
    winnerGain *= upsetMultiplier;
    loserLoss *= upsetMultiplier * 0.9;
  } else if (ratingGap < 0 && avgElo > 0) {
    const favoriteMultiplier = Math.max(
      0.35,
      1 - (-ratingGap / avgElo) * 0.5
    );
    winnerGain *= favoriteMultiplier;
    loserLoss *= favoriteMultiplier;
  }

  winnerGain = Math.round(winnerGain);
  loserLoss = Math.round(loserLoss);

  winnerGain = Math.max(1, winnerGain);
  loserLoss = Math.max(1, loserLoss);

  if (winnerGain <= loserLoss) {
    loserLoss = Math.max(1, winnerGain - 2);
  } else if (winnerGain - loserLoss < 2) {
    loserLoss = Math.max(1, winnerGain - 2);
  }

  return { winnerGain, loserLoss };
}

export function applyMatch(
  winnerElo: number,
  loserElo: number
): EloChange {
  const { winnerGain, loserLoss } = calculateEloChange(winnerElo, loserElo);
  return {
    winnerGain,
    loserLoss,
    winnerNewElo: winnerElo + winnerGain,
    loserNewElo: loserElo - loserLoss,
  };
}
