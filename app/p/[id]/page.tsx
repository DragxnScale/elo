import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPlayerDetail } from "@/app/actions";
import { ActivityCard } from "@/components/stats/ActivityCard";
import { BackLink } from "@/components/stats/BackLink";
import { EloSparkline } from "@/components/stats/EloSparkline";
import { HeadToHeadTable } from "@/components/stats/HeadToHeadTable";
import { MatchList } from "@/components/stats/MatchList";
import { StatGrid } from "@/components/stats/StatGrid";
import { Container } from "@/components/ui/container";
import { TextLink } from "@/components/ui/link";
import { Section } from "@/components/ui/section";
import {
  computeStats,
  dailyActivity,
  eloSeries,
  headToHead,
  playerMatches,
} from "@/lib/stats";

type Props = { params: Promise<{ id: string }> };

// One request, one set of queries: metadata and page share this call.
const getDetail = cache(getPlayerDetail);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const detail = await getDetail(id);
  if ("error" in detail) return { title: "Player · Kleos" };
  return { title: `${detail.player.name} · ${detail.leaderboard.name} · Kleos` };
}

export default async function PlayerPage({ params }: Props) {
  const { id } = await params;
  const detail = await getDetail(id);
  if ("error" in detail) notFound();

  const { player, leaderboard, matches, players, rank, boardSize, username } = detail;
  const offBoard = player.status === "left" || player.status === "removed";
  const history = playerMatches(matches, player.id);
  const stats = computeStats(history, player.elo);
  const names = Object.fromEntries(players.map((p) => [p.id, p.name]));
  const opponents = Object.fromEntries(players.map((p) => [p.id, { name: p.name }]));
  const activity = dailyActivity(history);

  return (
    <Container as="main" className="space-y-10 py-8 sm:py-12">
      <div className="space-y-8">
        <div className="space-y-3">
          <BackLink href="/">{leaderboard.name}</BackLink>

          <div className="space-y-1.5">
            <h1 className="break-words text-2xl font-semibold tracking-tight">{player.name}</h1>
            {(rank > 0 || offBoard || username) && (
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 break-words text-sm text-muted-foreground">
                {rank > 0 && (
                  <span>
                    #{rank} of {boardSize} on {leaderboard.name}
                  </span>
                )}
                {offBoard && <span>No longer on {leaderboard.name}</span>}
                {username && (
                  <>
                    {(rank > 0 || offBoard) && <span aria-hidden>·</span>}
                    <TextLink
                      variant="quiet"
                      href={`/u/${username}`}
                      className="min-w-0 underline decoration-border-strong"
                    >
                      @{username}
                    </TextLink>
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        <StatGrid stats={stats} elo={player.elo} />
      </div>

      <EloSparkline series={eloSeries(history)} />

      {activity.data.some((n) => n > 0) && (
        <Section title="Activity">
          <ActivityCard
            data={activity.data}
            endDate={activity.endDate}
            className="terrain-theme max-w-none"
          />
        </Section>
      )}

      <Section title="Recent matches">
        <MatchList matches={history} opponents={opponents} />
      </Section>

      {history.length > 0 && (
        <Section
          title="Head to head"
          description="Record against each opponent, most played first."
        >
          <HeadToHeadTable rows={headToHead(history)} names={names} />
        </Section>
      )}
    </Container>
  );
}
