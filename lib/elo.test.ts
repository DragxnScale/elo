import { calculateEloChange } from "./elo";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✗ ${name}`, e);
    process.exitCode = 1;
  }
}

test("tie returns no change", () => {
  const r = calculateEloChange(1000, 1200, 5, 5);
  if (r.player1Change !== 0 || r.player2Change !== 0) {
    throw new Error("tie should not change elo");
  }
});

test("winner gains more than loser loses", () => {
  const r = calculateEloChange(1000, 1000, 10, 5);
  if (r.winnerGain <= r.loserLoss) {
    throw new Error(`${r.winnerGain} <= ${r.loserLoss}`);
  }
  if (r.loserLoss !== Math.round(r.winnerGain * 0.75)) {
    throw new Error("loser loss should be 75% of winner gain");
  }
});

test("upset gives bigger gain to underdog winner", () => {
  const upset = calculateEloChange(800, 1400, 10, 5);
  const favorite = calculateEloChange(1400, 800, 10, 5);
  if (upset.winnerGain <= favorite.winnerGain) {
    throw new Error("upset should reward more");
  }
});

test("larger score margin increases change", () => {
  const close = calculateEloChange(1000, 1000, 11, 10);
  const blowout = calculateEloChange(1000, 1000, 20, 10);
  if (blowout.winnerGain <= close.winnerGain) {
    throw new Error("bigger margin should mean bigger gain");
  }
});

test("respects minWinGain", () => {
  const r = calculateEloChange(2000, 2000, 1, 0);
  if (r.winnerGain < 40) throw new Error(`expected min 40, got ${r.winnerGain}`);
});

test("player changes apply to correct sides", () => {
  const r = calculateEloChange(1000, 1200, 10, 3);
  if (r.player1NewElo !== 1000 + r.player1Change) throw new Error("p1 elo");
  if (r.player2NewElo !== 1200 + r.player2Change) throw new Error("p2 elo");
  if (r.player1Change <= 0) throw new Error("player1 should gain as winner");
  if (r.player2Change >= 0) throw new Error("player2 should lose");
});
