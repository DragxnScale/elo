"use client";

import { useEffect, useRef, useState } from "react";
import { getMatches, undoLastMatch } from "@/app/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { formatElo, formatScore } from "@/components/manage/format";
import { Live } from "@/components/manage/live";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Section } from "@/components/ui/section";
import { Delta } from "@/components/ui/stat";
import type { Match, Player } from "@/lib/types";

type LastMatchProps = {
  leaderboardId: string;
  players: Player[];
  /** Bump after a match is recorded or undone to reload the newest match. */
  refreshKey: number;
  /** Reload players and rankings after an undo. */
  onUndone: () => Promise<void> | void;
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * The board's newest match, with a way to take it back. Only the newest can be
 * undone, so ratings always unwind in the order they were applied; undoing
 * again steps further back.
 */
export function LastMatch({
  leaderboardId,
  players,
  refreshKey,
  onUndone,
}: LastMatchProps) {
  const [match, setMatch] = useState<Match | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [announcement, setAnnouncement] = useState<string | undefined>();
  const latest = useRef(0);
  // Keeps the "undone" message through the reload that the undo itself causes.
  const keepAnnouncement = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const request = ++latest.current;
    (async () => {
      const result = await getMatches(leaderboardId, 1);
      if (cancelled || request !== latest.current) return;
      setMatch(result.matches[0] ?? null);
      setError(undefined);
      if (keepAnnouncement.current) keepAnnouncement.current = false;
      else setAnnouncement(undefined);
    })();
    return () => {
      cancelled = true;
    };
  }, [leaderboardId, refreshKey]);

  const nameOf = (id: string) =>
    players.find((p) => p.id === id)?.name ?? "A former player";

  async function undo() {
    if (!match) return;
    setBusy(true);
    setError(undefined);
    const result = await undoLastMatch(leaderboardId).catch(() => ({
      error: "Couldn't reach the server. Sign in again if you've been away, then retry.",
    }));
    if ("error" in result && result.error) {
      setBusy(false);
      setConfirming(false);
      setError(result.error);
      return;
    }
    keepAnnouncement.current = true;
    setAnnouncement(
      `Match undone. ${nameOf(match.player1_id)} and ${nameOf(match.player2_id)} are back to their earlier ratings.`
    );
    await onUndone();
    setBusy(false);
    setConfirming(false);
  }

  const rows = match
    ? [
        {
          id: match.player1_id,
          before: match.player1_elo_before,
          change: match.player1_change,
          score: match.player1_score,
        },
        {
          id: match.player2_id,
          before: match.player2_elo_before,
          change: match.player2_change,
          score: match.player2_score,
        },
      ]
    : [];
  const [winner, loser] = [...rows].sort((a, b) => b.score - a.score);

  return (
    <>
      {match && winner && loser && (
        <Section
          title="Last match"
          description="Entered the wrong score? Undo it, then record it again."
        >
          <div className="border-t border-border pt-3">
            <p className="text-base font-medium text-foreground">
              {nameOf(winner.id)} {winner.score === loser.score ? `and ${nameOf(loser.id)} tied` : `beat ${nameOf(loser.id)}`},{" "}
              <span className="whitespace-nowrap tabular-nums">
                {formatScore(winner.score)} to {formatScore(loser.score)}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              <time dateTime={match.created_at}>
                {formatWhen(match.created_at)}
              </time>
            </p>
          </div>
          <ul>
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-4 border-t border-border py-2.5"
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium text-foreground">
                    {nameOf(row.id)}
                  </p>
                  <p className="text-sm tabular-nums text-muted-foreground">
                    <span className="sr-only">From </span>
                    {formatElo(row.before)}{" "}
                    <span aria-hidden>→</span>
                    <span className="sr-only"> to </span>{" "}
                    {formatElo(row.before + row.change)}
                  </p>
                </div>
                <Delta value={row.change} className="shrink-0 text-base font-semibold" />
              </li>
            ))}
          </ul>
          {error && (
            <Notice tone="error" title="Couldn't undo the match">
              {error}
            </Notice>
          )}
          <Button
            variant="danger"
            className="-ml-4"
            onClick={() => setConfirming(true)}
          >
            Undo this match
          </Button>
        </Section>
      )}

      <Live>
        {announcement && (
          <p role="none" className="text-sm text-muted-foreground">
            {announcement}
          </p>
        )}
      </Live>

      <ConfirmDialog
        open={confirming}
        title="Undo this match?"
        message={
          match
            ? `${nameOf(match.player1_id)} goes back to ${formatElo(match.player1_elo_before)} and ${nameOf(match.player2_id)} to ${formatElo(match.player2_elo_before)}. The match is removed from everyone's stats.`
            : ""
        }
        confirmLabel="Undo match"
        loading={busy}
        onConfirm={undo}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
