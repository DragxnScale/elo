const K_FACTOR = 64;

function expectedScore(playerElo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

export type EloChange = {
  winnerGain: number;
  loserLoss: number;
  winnerNewElo: number;
  loserNewElo: number;
};

export function calculateEloChange(
  winnerElo: number,
  loserElo: number
): Pick<EloChange, "winnerGain" | "loserLoss"> {
  const expectedWinner = expectedScore(winnerElo, loserElo);
  const expectedLoser = expectedScore(loserElo, winnerElo);

  let winnerGain = Math.round(K_FACTOR * (1 - expectedWinner));
  let loserLoss = Math.round(K_FACTOR * expectedLoser);

  winnerGain = Math.max(1, winnerGain);
  loserLoss = Math.max(1, loserLoss);

  if (winnerGain <= loserLoss) {
    const gap = loserLoss - winnerGain + 1;
    winnerGain += Math.ceil(gap / 2) + 1;
    loserLoss = Math.max(1, loserLoss - Math.floor(gap / 2));
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
