import { formatRatio, formatWinRate, type PlayerStats } from "@/lib/stats";
import { Stat, StatGroup } from "@/components/ui/stat";
import { formatRecord } from "@/lib/utils";
import { formatScore } from "./format";

/** Spoken form of a streak letter: "3 wins in a row", "1 loss in a row". */
function streakPhrase(result: "W" | "L", count: number): string {
  const noun = result === "W" ? (count === 1 ? "win" : "wins") : count === 1 ? "loss" : "losses";
  return `${count} ${noun} in a row`;
}

const none = <span className="text-muted-foreground">—</span>;

export function StatGrid({ stats, elo }: { stats: PlayerStats; elo?: number }) {
  const streak = stats.currentStreak;
  const hasMatches = stats.played > 0;

  return (
    <StatGroup columns={4}>
      {elo !== undefined && <Stat label="Rating" value={String(elo)} size="lg" />}
      <Stat label="Record" value={formatRecord(stats.wins, stats.losses)} />
      <Stat label="Win rate" value={hasMatches ? formatWinRate(stats.winRate) : none} />
      <Stat
        label="W/L ratio"
        value={stats.winLossRatio === null ? none : formatRatio(stats.winLossRatio)}
      />
      <Stat
        label="Streak"
        tone={streak ? (streak.result === "W" ? "win" : "loss") : undefined}
        value={
          streak ? (
            <>
              {streak.result}
              {streak.count}
              <span className="sr-only"> ({streakPhrase(streak.result, streak.count)})</span>
            </>
          ) : (
            none
          )
        }
      />
      <Stat
        label="Best streak"
        tone={stats.longestWinStreak ? "win" : undefined}
        value={
          stats.longestWinStreak ? (
            <>
              W{stats.longestWinStreak}
              <span className="sr-only"> ({streakPhrase("W", stats.longestWinStreak)})</span>
            </>
          ) : (
            none
          )
        }
      />
      <Stat label="Peak" value={stats.peakElo === null ? none : String(stats.peakElo)} />
      <Stat
        label="Avg score"
        value={
          stats.avgPointsFor === null || stats.avgPointsAgainst === null
            ? none
            : formatScore(stats.avgPointsFor, stats.avgPointsAgainst, 1)
        }
      />
    </StatGroup>
  );
}
