import { calculateEloChange, experienceCushion } from "./elo";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✗ ${name}`, e);
    process.exitCode = 1;
  }
}

function eq<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

test("tie between equal ratings changes nothing", () => {
  const r = calculateEloChange(1000, 1000, 5, 5);
  eq(r.outcome, "tie", "outcome");
  eq(r.player1Change, 0, "p1");
  eq(r.player2Change, 0, "p2");
});

test("tie moves points from the favourite to the underdog", () => {
  const r = calculateEloChange(100000, 1000, 3, 3);
  eq(r.player2Change, 40, "underdog gains K/2");
  eq(r.player1Change, -30, "favourite loses 75% of that (new player)");
});

test("beating a far weaker player earns the minimum", () => {
  const r = calculateEloChange(100000, 1000, 21, 0);
  eq(r.player1Change, 1, "favourite gain");
  eq(r.player2Change, 0, "underdog loss");
});

test("the winner always gains more than the loser loses", () => {
  // Every combination of gaps, scores and experience: ratings never shrink.
  for (const gap of [0, 50, 200, 400, 800, 2000, 99000]) {
    for (const [s1, s2] of [[1, 0], [21, 20], [21, 0], [0, 21], [5, 5], [-3, 4]]) {
      for (const games of [0, 10, 49, 50, 200]) {
        for (const [e1, e2] of [[1000 + gap, 1000], [1000, 1000 + gap]]) {
          const r = calculateEloChange(e1, e2, s1, s2, { player1: games, player2: 200 - games });
          const total = r.player1Change + r.player2Change;
          if (r.outcome !== "tie" && total < 1) {
            throw new Error(`win ${e1}/${e2} ${s1}-${s2}: ${r.player1Change} / ${r.player2Change}`);
          }
          if (r.outcome === "tie" && (total < 0 || (e1 !== e2 && total < 1))) {
            throw new Error(`tie ${e1}/${e2}: ${r.player1Change} / ${r.player2Change}`);
          }
          const winnerChange = r.outcome === "player1" ? r.player1Change : r.player2Change;
          if (r.outcome !== "tie" && winnerChange < 1) throw new Error("a win always gains");
        }
      }
    }
  }
});

test("an upset earns the most", () => {
  const upset = calculateEloChange(800, 1400, 10, 5);
  const favourite = calculateEloChange(1400, 800, 10, 5);
  if (upset.player1Change <= favourite.player1Change * 5) {
    throw new Error(`upset ${upset.player1Change} vs favourite ${favourite.player1Change}`);
  }
});

test("even match: winner gains, loser loses 75% of it", () => {
  const r = calculateEloChange(1000, 1000, 10, 5);
  // K 80 * 0.5 * margin x(1 + (5/25)^0.75) = 40 * 1.299 -> 52; loss 52 * 0.75 -> 39.
  eq(r.player1Change, 52, "gain");
  eq(r.player2Change, -39, "loss");
});

test("larger score margin increases the swing, capped at x3", () => {
  const close = calculateEloChange(1000, 1000, 11, 10);
  const blowout = calculateEloChange(1000, 1000, 20, 10);
  const absurd = calculateEloChange(1000, 1000, 1000, 0);
  if (blowout.player1Change <= close.player1Change) throw new Error("margin");
  eq(absurd.scoreMultiplier, 3, "cap");
  eq(absurd.player1Change, 120, "capped gain");
});

test("experience cushions losses, not gains", () => {
  const rookie = calculateEloChange(1000, 1000, 10, 5, { player1: 0, player2: 0 });
  const veteran = calculateEloChange(1000, 1000, 10, 5, { player1: 0, player2: 80 });
  eq(veteran.player1Change, rookie.player1Change, "winner gain unchanged");
  // Raw swing 51.96 x 0.75 x 0.6 (50+ games) = 23.4 -> 23, against 39 for a newcomer.
  eq(veteran.player2Change, -23, "veteran loss x0.6");
  eq(experienceCushion(0), 1, "new");
  eq(experienceCushion(25), 0.8, "halfway");
  eq(experienceCushion(50), 0.6, "floor reached");
  eq(experienceCushion(500), 0.6, "floor");
});

test("player changes apply to the right sides", () => {
  const r = calculateEloChange(1000, 1200, 3, 10);
  eq(r.outcome, "player2", "outcome");
  eq(r.player1NewElo, 1000 + r.player1Change, "p1 elo");
  eq(r.player2NewElo, 1200 + r.player2Change, "p2 elo");
  if (r.player2Change <= 0 || r.player1Change >= 0) throw new Error("signs");
});
