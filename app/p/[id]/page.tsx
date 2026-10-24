import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayerDetail } from "@/app/actions";
import { EloSparkline } from "@/components/stats/EloSparkline";
import { HeadToHeadTable } from "@/components/stats/HeadToHeadTable";
import { MatchList } from "@/components/stats/MatchList";
import { StatGrid } from "@/components/stats/StatGrid";
import { computeStats, eloSeries, headToHead, playerMatches } from "@/lib/stats";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const detail = await getPlayerDetail(id);
  if ("error" in detail) return { title: "Player · BowlBoard" };
  return { title: `${detail.player.name} · ${detail.leaderboard.name} · BowlBoard` };
}

export default async function PlayerPage({ params }: Props) {
  const { id } = await params;
  const detail = await getPlayerDetail(id);
  if ("error" in detail) notFound();

  const { player, leaderboard, matches, players, rank, username } = detail;
  const history = playerMatches(matches, player.id);
  const stats = computeStats(history, player.elo);
  const names = Object.fromEntries(players.map((p) => [p.id, p.name]));
  const opponents = Object.fromEntries(players.map((p) => [p.id, { name: p.name }]));

  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10">
      <Link href="/" className="text-sm text-slate-500 hover:text-slate-300">
        ← {leaderboard.name}
      </Link>

      <header>
        <p className="text-sm text-slate-500">
          #{rank} of {players.length} on {leaderboard.name}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-50">
          {player.name}
        </h1>
        {username && (
          <Link href={`/u/${username}`} className="text-sm text-slate-400 hover:underline">
            @{username}
          </Link>
        )}
      </header>

      <StatGrid stats={stats} elo={player.elo} />
      <EloSparkline series={eloSeries(history)} />

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-400">Recent matches</h2>
        <MatchList matches={history} opponents={opponents} />
      </section>

      {history.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-slate-400">Head to head</h2>
          <HeadToHeadTable rows={headToHead(history)} names={names} />
        </section>
      )}
    </main>
  );
}
