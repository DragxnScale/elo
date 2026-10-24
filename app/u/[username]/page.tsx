import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProfileDetail } from "@/app/actions";
import ActivityTerrain from "@/components/kokonutui/activity-terrain";
import { BackLink } from "@/components/stats/BackLink";
import { EloSparkline } from "@/components/stats/EloSparkline";
import { formatMonthYear } from "@/components/stats/format";
import { MatchList } from "@/components/stats/MatchList";
import { StatGrid } from "@/components/stats/StatGrid";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { TextLink } from "@/components/ui/link";
import { Section } from "@/components/ui/section";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  computeStats,
  dailyActivity,
  eloSeries,
  formatWinRate,
  playerMatches,
  type PlayerMatch,
} from "@/lib/stats";
import { formatRecord } from "@/lib/utils";

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
  const activity = dailyActivity(allHistory);

  const opponentNames = Object.fromEntries(
    [...opponents, ...players.map((s) => s.player)].map((p) => [p.id, { name: p.name }])
  );
  const boardNames = Object.fromEntries(players.map((s) => [s.leaderboard.id, s.leaderboard.name]));
  const mostActive = [...perBoard].sort((a, b) => b.history.length - a.history.length)[0];

  const joined = formatMonthYear(profile.created_at);
  const meta =
    players.length === 0
      ? `Joined ${joined}`
      : `Plays on ${players.length} leaderboard${players.length === 1 ? "" : "s"} · joined ${joined}`;

  const lead = (
    <div className="space-y-3">
      <BackLink href="/">BowlBoard</BackLink>
      <div className="space-y-1.5">
        <h1 className="break-words text-2xl font-semibold tracking-tight">@{profile.username}</h1>
        <p className="text-sm text-muted-foreground">{meta}</p>
      </div>
    </div>
  );

  if (players.length === 0) {
    return (
      <Container as="main" className="space-y-10 py-8 sm:py-12">
        {lead}
        <EmptyState
          title="Not on any leaderboard yet"
          description="Ask a board owner to link this account."
        />
      </Container>
    );
  }

  return (
    <Container as="main" className="space-y-10 py-8 sm:py-12">
      <div className="space-y-8">
        {lead}
        <StatGrid stats={overall} />
      </div>

      <Section title="Leaderboards">
        <Table>
          <caption className="sr-only">Record and rating on each leaderboard</caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Board</TableHead>
              <TableHead numeric>W–L</TableHead>
              <TableHead numeric className="hidden min-[24rem]:table-cell">
                Win %
              </TableHead>
              <TableHead numeric>ELO</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {perBoard.map(({ player, leaderboard, stats }) => (
              <TableRow key={player.id}>
                <TableCell className="break-words">
                  <TextLink variant="plain" href={`/p/${player.id}`} className="-my-3 block py-3">
                    {leaderboard.name}
                  </TextLink>
                </TableCell>
                <TableCell numeric>{formatRecord(stats.wins, stats.losses)}</TableCell>
                <TableCell numeric className="hidden min-[24rem]:table-cell">
                  {formatWinRate(stats.winRate)}
                </TableCell>
                <TableCell numeric className="text-base font-semibold">
                  {player.elo}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      {mostActive && (
        <EloSparkline
          series={eloSeries(mostActive.history)}
          boardName={mostActive.leaderboard.name}
        />
      )}

      {activity.data.some((n) => n > 0) && (
        <Section title="Activity">
          <ActivityTerrain
            data={activity.data}
            endDate={activity.endDate}
            title="Matches played"
            unit={["match", "matches"]}
            className="terrain-theme max-w-none"
          />
        </Section>
      )}

      <Section title="Recent matches">
        <MatchList
          matches={allHistory}
          opponents={opponentNames}
          boards={players.length > 1 ? boardNames : undefined}
          emptyMessage="No matches yet."
        />
      </Section>
    </Container>
  );
}
