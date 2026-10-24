import type { ReactNode } from "react";
import { TextLink } from "@/components/ui/link";
import { cn } from "@/lib/utils";
import { Delta, ResultMark } from "@/components/ui/stat";
import type { PlayerMatch } from "@/lib/stats";
import { formatScore, formatShortDate } from "./format";

type MatchListProps = {
  matches: PlayerMatch[];
  /** Opponent display info by player id. */
  opponents: Record<string, { name: string } | undefined>;
  /** Board name by leaderboard id, shown when matches span boards. */
  boards?: Record<string, string>;
  limit?: number;
  /** Shown when there are no matches. */
  emptyMessage?: ReactNode;
};

export function MatchList({
  matches,
  opponents,
  boards,
  limit = 20,
  emptyMessage,
}: MatchListProps) {
  const recent = [...matches]
    .sort((a, b) => b.playedAt.localeCompare(a.playedAt))
    .slice(0, limit);

  if (recent.length === 0) {
    return (
      <p className="border-t border-border pt-4 text-sm text-muted-foreground">
        {emptyMessage ?? "No matches yet. Record one from the Edit tab."}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border border-t border-border">
      {recent.map((m) => {
        const board = boards?.[m.leaderboardId];
        return (
          <li
            key={m.id}
            className="grid min-h-12 grid-cols-[1.25rem_minmax(0,1fr)_4.5rem_2.5rem] items-baseline gap-x-3 py-3 text-sm min-[24rem]:grid-cols-[1.25rem_minmax(0,1fr)_4.5rem_2.5rem_3rem]"
          >
            <ResultMark result={m.result} />
            <div className="min-w-0 break-words">
              <p>
                <span className="text-muted-foreground">vs </span>
                {/* The pseudo-element grows the tap target to 44px without moving anything. */}
                <TextLink
                  variant="plain"
                  href={`/p/${m.opponentId}`}
                  className="relative before:absolute before:inset-x-0 before:-inset-y-3 before:content-['']"
                >
                  {opponents[m.opponentId]?.name ?? "Unknown"}
                </TextLink>
              </p>
              {/* Below 384px the date column is gone; it moves under the name instead of vanishing. */}
              <p className={cn("text-muted-foreground", !board && "min-[24rem]:hidden")}>
                {board}
                {board && (
                  <span className="min-[24rem]:hidden" aria-hidden>
                    {" · "}
                  </span>
                )}
                <time dateTime={m.playedAt} className="min-[24rem]:hidden">
                  {formatShortDate(m.playedAt)}
                </time>
              </p>
            </div>
            <span className="text-right tabular-nums">
              {formatScore(m.pointsFor, m.pointsAgainst)}
            </span>
            <Delta value={m.change} className="block text-right" />
            <time
              dateTime={m.playedAt}
              className="hidden text-right text-muted-foreground min-[24rem]:block"
            >
              {formatShortDate(m.playedAt)}
            </time>
          </li>
        );
      })}
    </ul>
  );
}
