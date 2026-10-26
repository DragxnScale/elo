"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Surface } from "@/components/ui/surface";
import { Delta } from "@/components/ui/stat";
import type { EloChangeResult } from "@/lib/elo";
import { formatElo, formatScore } from "@/components/manage/format";

export type PendingPreview = {
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
  player1Score: number;
  player2Score: number;
  result: EloChangeResult;
};

/** "Ana beat Ben, 21 to 17": winner first. "Ana and Ben tied, 3 to 3" for a draw. */
export function describeResult(pending: PendingPreview): string {
  if (pending.player1Score === pending.player2Score) {
    const score = formatScore(pending.player1Score);
    return `${pending.player1Name} and ${pending.player2Name} tied, ${score} to ${score}`;
  }
  const player1Won = pending.player1Score > pending.player2Score;
  const winner = player1Won ? pending.player1Name : pending.player2Name;
  const loser = player1Won ? pending.player2Name : pending.player1Name;
  const winnerScore = player1Won ? pending.player1Score : pending.player2Score;
  const loserScore = player1Won ? pending.player2Score : pending.player1Score;
  return `${winner} beat ${loser}, ${formatScore(winnerScore)} to ${formatScore(loserScore)}`;
}

/** Why the numbers are what they are, in one line. */
function explain(pending: PendingPreview): string {
  const { result } = pending;
  const p1Favoured = result.expectedScore >= 0.5;
  const favourite = p1Favoured ? pending.player1Name : pending.player2Name;
  const chance = Math.round((p1Favoured ? result.expectedScore : 1 - result.expectedScore) * 100);
  const parts = [
    chance === 50
      ? "Even ratings"
      : `${favourite} was expected to win ${chance}% of the time`,
  ];
  if (result.scoreMultiplier > 1) parts.push(`score margin ×${result.scoreMultiplier.toFixed(2)}`);
  const cushioned = [
    { name: pending.player1Name, change: result.player1Change, cushion: result.player1Cushion },
    { name: pending.player2Name, change: result.player2Change, cushion: result.player2Cushion },
  ].filter((p) => p.change < 0 && p.cushion < 1);
  for (const p of cushioned) {
    parts.push(`${p.name}'s loss cushioned ×${p.cushion.toFixed(2)} for experience`);
  }
  return `${parts.join(" · ")}.`;
}

type MatchPreviewProps = {
  pending: PendingPreview;
  loading: boolean;
  error?: string;
  onConfirm: () => void;
  onEdit: () => void;
};

/**
 * The one card on the Edit screen: what the match will do to both ratings,
 * before anything is committed. Colour lives only in the deltas.
 */
export function MatchPreview({
  pending,
  loading,
  error,
  onConfirm,
  onEdit,
}: MatchPreviewProps) {
  const headingId = useId();
  const regionRef = useRef<HTMLDivElement>(null);

  // Mounted only while a preview exists: bring it into view and move focus
  // to it so keyboard and screen-reader users land on the result.
  useEffect(() => {
    const region = regionRef.current;
    if (!region) return;
    region.scrollIntoView({ block: "nearest" });
    region.focus({ preventScroll: true });
  }, []);

  const { result } = pending;
  const rows = [
    {
      id: pending.player1Id,
      name: pending.player1Name,
      before: result.player1NewElo - result.player1Change,
      after: result.player1NewElo,
      change: result.player1Change,
    },
    {
      id: pending.player2Id,
      name: pending.player2Name,
      before: result.player2NewElo - result.player2Change,
      after: result.player2NewElo,
      change: result.player2Change,
    },
  ];

  return (
    <Surface
      ref={regionRef}
      role="region"
      aria-labelledby={headingId}
      tabIndex={-1}
      padding="md"
      className="space-y-4"
    >
      <h3 id={headingId} className="text-base font-semibold text-foreground">
        {describeResult(pending)}
      </h3>
      <ul>
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-center justify-between gap-4 border-t border-border py-3"
          >
            <div className="min-w-0">
              <p className="break-words text-base font-medium text-foreground">
                {row.name}
              </p>
              <p className="text-sm tabular-nums">
                <span className="text-muted-foreground">
                  <span className="sr-only">From </span>
                  {formatElo(row.before)}
                </span>{" "}
                <span aria-hidden className="text-muted-foreground">
                  →
                </span>
                <span className="sr-only"> to </span>{" "}
                <span className="font-semibold text-foreground">
                  {formatElo(row.after)}
                </span>
              </p>
            </div>
            <Delta
              value={row.change}
              className="shrink-0 text-3xl font-semibold"
            />
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">{explain(pending)}</p>
      {error && (
        <Notice tone="error" title="Couldn't record the match">
          {error}
        </Notice>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" size="lg" disabled={loading} onClick={onEdit}>
          Edit scores
        </Button>
        <Button size="lg" loading={loading} onClick={onConfirm}>
          {loading ? "Applying…" : "Confirm"}
        </Button>
      </div>
    </Surface>
  );
}
