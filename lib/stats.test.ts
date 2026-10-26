import { computeStats, dailyActivity, eloSeries, headToHead, playerMatches, recordsByPlayer } from "./stats";
import type { Match } from "./types";

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
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

let n = 0;
function match(p1: string, p2: string, s1: number, s2: number, e1: number, e2: number, c1: number, c2: number): Match {
  n++;
  return {
    id: `m${n}`,
    leaderboard_id: "lb",
    player1_id: p1,
    player2_id: p2,
    player1_score: s1,
    player2_score: s2,
    player1_elo_before: e1,
    player2_elo_before: e2,
    player1_change: c1,
    player2_change: c2,
    created_by: null,
    created_at: new Date(Date.UTC(2026, 0, 1, 0, n)).toISOString(),
  };
}

// a beats b, b beats a (a as player2), a beats c, a beats b
const matches = [
  match("a", "b", 10, 5, 1000, 1000, 40, -30),
  match("b", "a", 8, 3, 970, 1040, 50, -38),
  match("a", "c", 7, 2, 1002, 1000, 40, -30),
  match("b", "a", 1, 9, 1020, 1042, -30, 40),
];

test("playerMatches sees both sides", () => {
  const a = playerMatches(matches, "a");
  eq(a.length, 4, "count");
  eq(a.map((m) => m.result), ["W", "L", "W", "W"], "results");
  eq(a[1]!.change, -38, "change as player2");
  eq(a[1]!.eloAfter, 1002, "eloAfter");
});

test("computeStats wins, losses, ratio, streaks", () => {
  const s = computeStats(playerMatches(matches, "a"), 1082);
  eq([s.played, s.wins, s.losses], [4, 3, 1], "W/L");
  eq(s.winRate, 0.75, "win rate");
  eq(s.winLossRatio, 3, "ratio");
  eq(s.currentStreak, { result: "W", count: 2 }, "current streak");
  eq(s.longestWinStreak, 2, "longest");
  eq(s.peakElo, 1082, "peak");
  eq(s.form, ["W", "W", "L", "W"], "form newest first");
  eq(s.pointsFor, 29, "points for");
  eq(s.biggestWin?.id, "m4", "biggest win");
});

test("computeStats with no matches", () => {
  const s = computeStats([]);
  eq([s.played, s.winRate, s.winLossRatio, s.currentStreak], [0, null, null, null], "empty");
});

test("undefeated ratio equals wins", () => {
  const s = computeStats(playerMatches(matches, "a").filter((m) => m.result === "W"));
  eq(s.winLossRatio, 3, "ratio");
});

test("headToHead groups by opponent", () => {
  eq(headToHead(playerMatches(matches, "a")), [
    { opponentId: "b", wins: 2, losses: 1, draws: 0, played: 3 },
    { opponentId: "c", wins: 1, losses: 0, draws: 0, played: 1 },
  ], "h2h");
});

test("eloSeries starts at the first rating", () => {
  eq(eloSeries(playerMatches(matches, "a")), [1000, 1040, 1002, 1042, 1082], "series");
});

test("recordsByPlayer", () => {
  const r = recordsByPlayer(matches);
  eq(r.get("a"), { wins: 3, losses: 1, draws: 0 }, "a");
  eq(r.get("b"), { wins: 1, losses: 2, draws: 0 }, "b");
  eq(r.get("c"), { wins: 0, losses: 1, draws: 0 }, "c");
});

test("dailyActivity buckets by UTC day, oldest first", () => {
  const end = new Date(Date.UTC(2026, 0, 10, 15));
  const { data, endDate } = dailyActivity(
    [
      { playedAt: "2026-01-10T01:00:00Z" },
      { playedAt: "2026-01-10T23:00:00Z" },
      { playedAt: "2026-01-04T12:00:00Z" },
      { playedAt: "2025-01-01T12:00:00Z" }, // outside the window
    ],
    1,
    end
  );
  eq(endDate, "2026-01-10", "end date");
  eq(data, [1, 0, 0, 0, 0, 0, 2], "counts");
});

test("draws count as games, break win streaks and show in records", () => {
  const withDraw = [
    match("a", "b", 10, 5, 1000, 1000, 52, -39),
    match("a", "b", 7, 7, 1052, 961, -6, 8),
    match("b", "a", 3, 3, 969, 1046, 6, -4),
  ];
  const s = computeStats(playerMatches(withDraw, "a"));
  eq([s.played, s.wins, s.losses, s.draws], [3, 1, 0, 2], "W/L/D");
  eq(s.winRate, 1 / 3, "win rate counts draws as games");
  eq(s.longestWinStreak, 1, "draw breaks the run");
  eq(s.currentStreak, { result: "D", count: 2 }, "draw streak");
  eq(s.form, ["D", "D", "W"], "form");
  eq(recordsByPlayer(withDraw).get("b"), { wins: 0, losses: 1, draws: 2 }, "records");
  eq(headToHead(playerMatches(withDraw, "a"))[0]!.draws, 2, "h2h draws");
});
