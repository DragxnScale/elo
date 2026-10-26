import { calculateEloChange, experienceCushion, pointsShare } from "./elo";
import { formatShare } from "./utils";

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

test("points share: shutout 1, tie 1/2, handles negatives", () => {
  eq(pointsShare(21, 0), 1, "shutout");
  eq(pointsShare(5, 5), 0.5, "tie");
  eq(pointsShare(0, 0), 0.5, "0-0");
  eq(pointsShare(10, 5), 0.5 + 0.5 * (5 / 15), "10-5");
  eq(pointsShare(-3, -5), 0.5 + 0.5 * (2 / 8), "both negative");
});

test("tie between equal ratings changes nothing", () => {
  const r = calculateEloChange(1000, 1000, 5, 5);
  eq(r.outcome, "tie", "outcome");
  eq(r.player1Change, 0, "p1");
  eq(r.player2Change, 0, "p2");
});

test("tie across a huge gap gives the underdog thousands", () => {
  // K = 200 + 0.1 * 99000 = 10100; expected ~100% vs actual 50%.
  const r = calculateEloChange(100000, 1000, 3, 3);
  eq(r.player2Change, 5050, "underdog gain");
  eq(r.player1Change, -3788, "favourite loss");
});

test("a favourite who wins by less than expected loses rating", () => {
  const huge = calculateEloChange(100000, 1000, 21, 17);
  eq(huge.outcome, "player1", "favourite won");
  if (!(huge.player1Change < 0 && huge.player2Change > 1000)) {
    throw new Error(`${huge.player1Change} / ${huge.player2Change}`);
  }
  // 1200 vs 1000 expects ~76% of the points; 21-15 is only 58%.
  const normal = calculateEloChange(1200, 1000, 21, 15);
  eq(normal.player1Change, -29, "favourite");
  eq(normal.player2Change, 39, "underdog");
});

test("a result exactly as expected changes nothing", () => {
  const r = calculateEloChange(100000, 1000, 21, 0);
  eq(r.player1Change, 0, "favourite");
  eq(r.player2Change, 0, "underdog");
});

test("the closer the result to expectations, the smaller the swing", () => {
  const narrow = calculateEloChange(100000, 1000, 21, 17).player2Change;
  const wider = calculateEloChange(100000, 1000, 21, 5).player2Change;
  if (!(narrow > wider && wider > 0)) throw new Error(`${narrow} vs ${wider}`);
});

test("even ratings: bigger margins move more", () => {
  eq(calculateEloChange(1000, 1000, 21, 17).player1Change, 11, "21-17 gain");
  eq(calculateEloChange(1000, 1000, 10, 5).player1Change, 33, "10-5 gain");
  const shutout = calculateEloChange(1000, 1000, 21, 0);
  eq(shutout.player1Change, 100, "shutout gain");
  eq(shutout.player2Change, -75, "shutout loss");
});

test("experience cushions losses, not gains", () => {
  const rookie = calculateEloChange(1000, 1000, 21, 0, { player1: 0, player2: 0 });
  const veteran = calculateEloChange(1000, 1000, 21, 0, { player1: 0, player2: 80 });
  eq(veteran.player1Change, rookie.player1Change, "gain unchanged");
  eq(veteran.player2Change, -45, "100 x 0.75 x 0.6");
  eq(experienceCushion(0), 1, "new");
  eq(experienceCushion(25), 0.8, "halfway");
  eq(experienceCushion(50), 0.6, "floor reached");
  eq(experienceCushion(500), 0.6, "floor");
});

test("whoever gains always gains more than the other loses", () => {
  for (const [e1, e2] of [[1000, 1000], [1200, 1000], [1000, 1400], [100000, 1000], [1000, 100000]]) {
    for (const [s1, s2] of [[1, 0], [21, 20], [21, 0], [0, 21], [5, 5], [-3, 4], [21, 17]]) {
      for (const g of [0, 10, 50, 200]) {
        const r = calculateEloChange(e1, e2, s1, s2, { player1: g, player2: 200 - g });
        const gained = Math.max(r.player1Change, r.player2Change);
        const total = r.player1Change + r.player2Change;
        if (gained > 0 && total < 1) {
          throw new Error(`${e1}/${e2} ${s1}-${s2}: ${r.player1Change} / ${r.player2Change}`);
        }
        if (gained === 0 && total !== 0) throw new Error("no gain means no loss");
      }
    }
  }
});

test("changes apply to the right sides", () => {
  const r = calculateEloChange(1000, 1200, 3, 21);
  eq(r.outcome, "player2", "outcome");
  eq(r.player1NewElo, 1000 + r.player1Change, "p1 elo");
  eq(r.player2NewElo, 1200 + r.player2Change, "p2 elo");
});

test("expected shares are shown precisely, never rounded to 100% or 0%", () => {
  const r = calculateEloChange(5000, 2000, 10, 10);
  eq(formatShare(r.expectedScore), "99.9999968%", "favourite");
  eq(formatShare(r.expectedScore2), "0.0000032%", "underdog");
  eq(formatShare(calculateEloChange(1200, 1000, 1, 1).expectedScore), "76%", "ordinary");
  eq(formatShare(calculateEloChange(1000, 1400, 1, 1).expectedScore), "9.1%", "one decimal");
  eq(formatShare(calculateEloChange(2400, 1000, 1, 1).expectedScore2), "0.032%", "small");
  const huge = calculateEloChange(100000, 1000, 3, 3);
  eq(formatShare(huge.expectedScore), "≈100%", "beyond double precision");
  eq(formatShare(huge.expectedScore2), "3.2 × 10⁻²⁴⁶%", "astronomically small");
  eq(formatShare(1, { exact: true }), "100%", "a real shutout");
  eq(formatShare(0.5), "50%", "even");
});
