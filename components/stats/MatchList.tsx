import Link from "next/link";
import type { PlayerMatch } from "@/lib/stats";

type MatchListProps = {
  matches: PlayerMatch[];
  /** Opponent display info by player id. */
  opponents: Record<string, { name: string } | undefined>;
  /** Board name by leaderboard id, shown when matches span boards. */
  boards?: Record<string, string>;
  limit?: number;
};

export function MatchList({ matches, opponents, boards, limit = 20 }: MatchListProps) {
  const recent = [...matches]
    .sort((a, b) => b.playedAt.localeCompare(a.playedAt))
    .slice(0, limit);

  if (recent.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">No matches yet.</p>;
  }

  return (
    <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
      {recent.map((m) => (
        <li key={m.id} className="flex items-center gap-3 px-4 py-3 text-sm">
          <span
            className={`w-5 font-mono font-semibold ${
              m.result === "W" ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {m.result}
          </span>
          <span className="min-w-0 flex-1 truncate text-slate-300">
            vs{" "}
            <Link href={`/p/${m.opponentId}`} className="text-slate-100 hover:underline">
              {opponents[m.opponentId]?.name ?? "Unknown"}
            </Link>
            {boards && (
              <span className="ml-2 text-xs text-slate-500">{boards[m.leaderboardId]}</span>
            )}
          </span>
          <span className="font-mono tabular-nums text-slate-400">
            {m.pointsFor}–{m.pointsAgainst}
          </span>
          <span
            className={`w-12 text-right font-mono tabular-nums ${
              m.change >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {m.change >= 0 ? `+${m.change}` : m.change}
          </span>
          <time
            dateTime={m.playedAt}
            className="hidden w-20 text-right text-xs text-slate-500 sm:block"
          >
            {new Date(m.playedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </time>
        </li>
      ))}
    </ul>
  );
}
