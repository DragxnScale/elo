import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfileDetail } from "@/app/actions";
import { EloSparkline } from "@/components/stats/EloSparkline";
import { MatchList } from "@/components/stats/MatchList";
import { StatGrid } from "@/components/stats/StatGrid";
import {
  computeStats,
  eloSeries,
  formatWinRate,
  playerMatches,
  type PlayerMatch,
} from "@/lib/stats";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${decodeURIComponent(username)} · BowlBoard` };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const detail = await getProfileDetail(decodeURIComponent(username));
  if ("error" in detail) notFound();

  const { profile, players, matches, opponents } = detail;

  const perBoard = players.map(({ player, leaderboard }) => {
    const history = playerMatches(matches, player.id);
    return { player, leaderboard, history, stats: computeStats(history, player.elo) };
  });
  const allHistory: PlayerMatch[] = perBoard.flatMap((b) => b.history);
  const overall = computeStats(allHistory);

  const opponentNames = Object.fromEntries(
    [...opponents, ...players.map((s) => s.player)].map((p) => [p.id, { name: p.name }])
  );
  const boardNames = Object.fromEntries(players.map((s) => [s.leaderboard.id, s.leaderboard.name]));
  const mostActive = [...perBoard].sort((a, b) => b.history.length - a.history.length)[0];

  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10">
      <Link href="/" className="text-sm text-slate-500 hover:text-slate-300">
        ← BowlBoard
      </Link>

      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-50">@{profile.username}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {players.length === 0
            ? "Not on any leaderboard yet."
            : `Plays on ${players.length} leaderboard${players.length === 1 ? "" : "s"} · joined ${new Date(
                profile.created_at
              ).toLocaleDateString(undefined, { month: "short", year: "numeric" })}`}
        </p>
      </header>

      <StatGrid stats={overall} />

      {mostActive && mostActive.history.length > 1 && (
        <EloSparkline series={eloSeries(mostActive.history)} />
      )}

      {perBoard.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-slate-400">Leaderboards</h2>
          <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
            {perBoard.map(({ player, leaderboard, stats }) => (
              <li key={player.id}>
                <Link
                  href={`/p/${player.id}`}
                  className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-900/50"
                >
                  <span className="min-w-0 flex-1 truncate text-slate-100">{leaderboard.name}</span>
                  <span className="font-mono tabular-nums text-slate-300">
                    {stats.wins}–{stats.losses}
                  </span>
                  <span className="w-12 text-right font-mono tabular-nums text-slate-500">
                    {formatWinRate(stats.winRate)}
                  </span>
                  <span className="w-14 text-right font-mono tabular-nums text-cyan-300">
                    {player.elo}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-400">Recent matches</h2>
        <MatchList
          matches={allHistory}
          opponents={opponentNames}
          boards={players.length > 1 ? boardNames : undefined}
        />
      </section>
    </main>
  );
}
