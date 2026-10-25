"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { getMatches, getPlayers } from "@/app/actions";
import { LiveIndicator } from "@/components/leaderboard/LiveIndicator";
import {
  RankingsHead,
  WIN_RATE_COLUMN,
} from "@/components/leaderboard/RankingsHead";
import { RankingsSkeleton } from "@/components/leaderboard/RankingsSkeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TextLink } from "@/components/ui/link";
import { Notice } from "@/components/ui/notice";
import { ShareCode } from "@/components/ui/share-code";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { formatWinRate, recordsByPlayer } from "@/lib/stats";
import type { Player } from "@/lib/types";
import { cn, formatRecord } from "@/lib/utils";

type LeaderboardTableProps = {
  leaderboardId: string;
  /** Shows a quiet "Share code" row above the table (used by the edit screen). */
  shareCode?: string;
  /** Shown under "No players yet". Hosts know best what to do next. */
  emptyDescription?: ReactNode;
};

type Records = Map<string, { wins: number; losses: number }>;

type TableData = {
  /** The board these rows belong to. A different id means "still loading". */
  leaderboardId: string;
  players: Player[];
  records: Records;
  /** True once rows have arrived, so a later failure keeps them on screen. */
  loaded: boolean;
  /** The last load failed. */
  failed: boolean;
  /** Players whose rating just changed; their rows play the settle animation. */
  settling: ReadonlySet<string>;
};

/** Wait this long after the last change before reloading (a match fires two). */
const RELOAD_DELAY_MS = 150;

export function LeaderboardTable({
  leaderboardId,
  shareCode,
  emptyDescription,
}: LeaderboardTableProps) {
  const [data, setData] = useState<TableData | null>(null);
  // What the realtime channel last reported, and for which board.
  const [channel, setChannel] = useState<{ id: string; live: boolean } | null>(
    null
  );
  const [attempt, setAttempt] = useState(0);
  // Lets the "Couldn't refresh" action run the effect's own loader.
  const reload = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let latestRequest = 0;
    // Ratings from the previous load of this board; null until the first one
    // lands, so the first load never settles. Local to this effect run, so a
    // board change starts fresh.
    let previousElo: Map<string, number> | null = null;

    async function load() {
      const request = ++latestRequest;
      let players: Player[] = [];
      let records: Records = new Map();
      let failed = false;
      try {
        const [playersResult, matchesResult] = await Promise.all([
          getPlayers(leaderboardId),
          getMatches(leaderboardId, 1000),
        ]);
        if (playersResult.error || matchesResult.error) {
          failed = true;
        } else {
          players = playersResult.players as Player[];
          records = recordsByPlayer(matchesResult.matches);
        }
      } catch {
        failed = true;
      }
      // Ignore a board that was left, and responses that arrive out of order.
      if (cancelled || request !== latestRequest) return;

      if (failed) {
        // Keep rows that are already on screen; only the Live label changes.
        setData((current) =>
          current && current.leaderboardId === leaderboardId
            ? { ...current, failed: true }
            : {
                leaderboardId,
                players: [],
                records: new Map(),
                loaded: false,
                failed: true,
                settling: new Set(),
              }
        );
        return;
      }

      const changed = new Set<string>();
      if (previousElo) {
        for (const player of players) {
          const before = previousElo.get(player.id);
          if (before !== undefined && before !== player.elo) {
            changed.add(player.id);
          }
        }
      }
      previousElo = new Map(players.map((player) => [player.id, player.elo]));

      setData((current) => {
        const stillSettling =
          current && current.leaderboardId === leaderboardId
            ? current.settling
            : new Set<string>();
        return {
          leaderboardId,
          players,
          records,
          loaded: true,
          failed: false,
          settling: new Set([...stillSettling, ...changed]),
        };
      });
    }

    load();
    reload.current = load;

    const supabase = createClient();
    const channel = supabase
      .channel(`players:${leaderboardId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `leaderboard_id=eq.${leaderboardId}`,
        },
        () => {
          clearTimeout(timer);
          timer = setTimeout(load, RELOAD_DELAY_MS);
        }
      )
      .subscribe((status) => {
        if (cancelled) return;
        setChannel({ id: leaderboardId, live: status === "SUBSCRIBED" });
        // Catch anything that landed between the first fetch and the subscription.
        if (status === "SUBSCRIBED") load();
      });

    return () => {
      cancelled = true;
      reload.current = null;
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [leaderboardId, attempt]);

  function retry() {
    setData(null);
    setAttempt((n) => n + 1);
  }

  function settled(playerId: string) {
    setData((current) => {
      if (!current || !current.settling.has(playerId)) return current;
      const settling = new Set(current.settling);
      settling.delete(playerId);
      return { ...current, settling };
    });
  }

  const shareRow = shareCode ? (
    <div className="mb-3 flex flex-wrap items-center gap-x-2 text-sm">
      <span className="text-muted-foreground">Share code</span>
      <ShareCode code={shareCode} />
    </div>
  ) : null;

  const loading = !data || data.leaderboardId !== leaderboardId;

  if (loading) {
    return (
      <div>
        {shareRow}
        <RankingsSkeleton />
      </div>
    );
  }

  if (data.failed && !data.loaded) {
    return (
      <div>
        {shareRow}
        <div className="space-y-3">
          <Notice tone="error" title="Couldn't load the rankings">
            Check your connection, then try again.
          </Notice>
          <Button variant="secondary" size="sm" onClick={retry}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  // "Connecting" until this board's channel has said anything; only a dropped
  // channel is "Reconnecting".
  const liveStatus =
    channel?.id !== leaderboardId
      ? "connecting"
      : channel.live
        ? "live"
        : "reconnecting";
  const footer = (
    <div className="mt-3 flex items-center justify-between gap-3">
      {data.failed ? (
        // Rows are on screen but the last refresh failed: say so, offer a way out.
        <>
          <p role="status" className="text-xs text-muted-foreground">
            Couldn&apos;t refresh the rankings.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => reload.current?.()}
          >
            Try again
          </Button>
        </>
      ) : (
        <LiveIndicator status={liveStatus} />
      )}
    </div>
  );

  if (data.players.length === 0) {
    return (
      <div>
        {shareRow}
        <EmptyState
          title="No players yet"
          description={
            emptyDescription ?? "Add the first player to start the rankings."
          }
        />
        {footer}
      </div>
    );
  }

  return (
    <div>
      {shareRow}
      <Table>
        <caption className="sr-only">Rankings</caption>
        <RankingsHead />
        <TableBody>
          {data.players.map((player, index) => {
            const record = data.records.get(player.id) ?? {
              wins: 0,
              losses: 0,
            };
            const played = record.wins + record.losses;
            return (
              <TableRow
                key={player.id}
                className={cn(data.settling.has(player.id) && "animate-settle")}
                onAnimationEnd={(event) => {
                  if (event.target === event.currentTarget) settled(player.id);
                }}
              >
                <TableCell className="align-baseline tabular-nums text-muted-foreground">
                  {index + 1}
                </TableCell>
                <TableCell className="align-baseline">
                  <TextLink
                    href={`/p/${player.id}`}
                    variant="plain"
                    className={cn(
                      // Inset focus ring: the table scrolls, so an outer ring
                      // on the last row would be clipped.
                      "-my-3 block py-3 wrap-anywhere focus-visible:-outline-offset-2",
                      index === 0 && "font-medium"
                    )}
                  >
                    {player.name}
                  </TextLink>
                </TableCell>
                <TableCell numeric className="align-baseline whitespace-nowrap">
                  {formatRecord(record.wins, record.losses)}
                </TableCell>
                <TableCell
                  numeric
                  className={cn("align-baseline", WIN_RATE_COLUMN)}
                >
                  {formatWinRate(played ? record.wins / played : null)}
                </TableCell>
                <TableCell
                  numeric
                  className="align-baseline whitespace-nowrap text-base font-semibold text-foreground"
                >
                  {player.elo}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {footer}
    </div>
  );
}
