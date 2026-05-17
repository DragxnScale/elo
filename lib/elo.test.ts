import { applyMatch, calculateEloChange } from "./elo";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✗ ${name}`, e);
    process.exitCode = 1;
  }
}

test("uses fixed base plus percent of elo at equal ratings", () => {
  const { winnerGain, loserLoss } = calculateEloChange(10000, 10000);
  if (winnerGain !== 18) throw new Error(`expected +18, got +${winnerGain}`);
  if (loserLoss !== 16) throw new Error(`expected -16, got -${loserLoss}`);
});

test("winner gains more than loser loses", () => {
  const { winnerGain, loserLoss } = calculateEloChange(1000, 1000);
  if (winnerGain <= loserLoss) throw new Error(`${winnerGain} <= ${loserLoss}`);
});

test("upset gives bigger gain to underdog winner", () => {
  const upset = calculateEloChange(800, 1400);
  const expected = calculateEloChange(1400, 800);
  if (upset.winnerGain <= expected.winnerGain) {
    throw new Error("upset should reward more");
  }
});

test("favorite beating underdog gives smaller changes", () => {
  const fav = calculateEloChange(1400, 800);
  const even = calculateEloChange(1000, 1000);
  if (fav.winnerGain >= even.winnerGain) {
    throw new Error("favorite win should gain less");
  }
});

test("underdog loss to favorite loses less", () => {
  const { loserLoss: underdogLoss } = calculateEloChange(1400, 800);
  const { loserLoss: evenLoss } = calculateEloChange(1000, 1000);
  if (underdogLoss >= evenLoss) {
    throw new Error("underdog should lose less when favorite wins");
  }
});

test("applyMatch returns new elos", () => {
  const r = applyMatch(1000, 1200);
  if (r.winnerNewElo <= 1000) throw new Error("winner should rise");
  if (r.loserNewElo >= 1200) throw new Error("loser should fall");
});
