"use client";

import { useEffect, useId, useRef, useState } from "react";
import { deleteMatch, getMatchHistory, restoreMatch } from "@/app/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { formatElo, formatScore } from "@/components/manage/format";
import { Live } from "@/components/manage/live";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { Delta } from "@/components/ui/stat";
import { cn } from "@/lib/utils";
import type { Match } from "@/lib/types";

type MatchHistoryProps = {
  leaderboardId: string;
  /** Bump after a match is recorded (or anything else changes) to reload. */
  refreshKey: number;
  /** Reload players and rankings after a delete or restore. */
  onChanged: () => Promise<void> | void;
};

/** Rows shown before "Show all". */
const COLLAPSED = 5;

const OFFLINE = "Couldn't reach the server. Sign in again if you've been away, then retry.";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Every match on the board, newest first. Deleting one drops it from the
 * rankings and stats and recalculates every match after it in order; it
 * stays here, marked deleted, and can be restored.
 */
export function MatchHistory({ leaderboardId, refreshKey, onChanged }: MatchHistoryProps) {
  const listId = useId();
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | undefined>();
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [deleting, setDeleting] = useState<Match | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const latest = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const request = ++latest.current;
    (async () => {
      const result = await getMatchHistory(leaderboardId).catch(() => ({
        error: OFFLINE,
        matches: [] as Match[],
        names: {} as Record<string, string>,
      }));
      if (cancelled || request !== latest.current) return;
      if ("error" in result && result.error) {
        setLoadError(result.error);
        return;
      }
      setLoadError(undefined);
      setMatches(result.matches);
      setNames(result.names);
    })();
    return () => {
      cancelled = true;
    };
  }, [leaderboardId, refreshKey]);

  const nameOf = (id: string) => names[id] ?? "A former player";

  function describe(m: Match): string {
    const p1 = nameOf(m.player1_id);
    const p2 = nameOf(m.player2_id);
    if (m.player1_score === m.player2_score) {
      return `${p1} and ${p2} tied, ${formatScore(m.player1_score)} to ${formatScore(m.player2_score)}`;
    }
    const p1Won = m.player1_score > m.player2_score;
    return `${p1Won ? p1 : p2} beat ${p1Won ? p2 : p1}, ${formatScore(p1Won ? m.player1_score : m.player2_score)} to ${formatScore(p1Won ? m.player2_score : m.player1_score)}`;
  }

  /** Run a delete or restore, then reload everything that depends on it. */
  async function act(match: Match, run: () => Promise<{ error?: string }>, done: string) {
    setBusy(match.id);
    setErrors((e) => ({ ...e, [match.id]: undefined }));
    try {
      const result = await run();
      if (result.error) {
        setErrors((e) => ({ ...e, [match.id]: result.error }));
        return;
      }
      setAnnouncement(done);
      await onChanged();
    } catch {
      setErrors((e) => ({ ...e, [match.id]: OFFLINE }));
    } finally {
      setBusy(null);
    }
  }

  if (loadError) {
    return (
      <Section title="Match history">
        <p role="alert" className="text-sm text-loss">
          Couldn&rsquo;t load the match history: {loadError}
        </p>
      </Section>
    );
  }
  if (!matches || matches.length === 0) return null;

  const live = matches.filter((m) => !m.deleted_at).length;
  const removed = matches.length - live;
  const shown = expanded ? matches : matches.slice(0, COLLAPSED);

  return (
    <Section
      title="Match history"
      description="Delete a match and every match after it is recalculated in order. Deleted matches stay here and can be restored."
      action={
        <span className="text-sm tabular-nums text-muted-foreground">
          {live} {live === 1 ? "match" : "matches"}
          {removed > 0 ? ` · ${removed} deleted` : ""}
        </span>
      }
    >
      <ul id={listId} className="border-t border-border">
        {shown.map((m) => {
          const isDeleted = !!m.deleted_at;
          const rowBusy = busy === m.id;
          return (
            <li key={m.id} className="space-y-1.5 border-b border-border py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p
                  className={cn(
                    "min-w-0 break-words text-base font-medium",
                    isDeleted ? "text-muted-foreground line-through decoration-border-strong" : "text-foreground"
                  )}
                >
                  {describe(m)}
                </p>
                <time dateTime={m.created_at} className="shrink-0 text-sm text-muted-foreground">
                  {formatWhen(m.created_at)}
                </time>
              </div>

              {isDeleted ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge>Deleted</Badge>
                  <span>Not counted in ratings or stats.</span>
                </p>
              ) : (
                <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm tabular-nums text-muted-foreground">
                  {[
                    { id: m.player1_id, before: m.player1_elo_before, change: m.player1_change },
                    { id: m.player2_id, before: m.player2_elo_before, change: m.player2_change },
                  ].map((side) => (
                    <li key={side.id}>
                      <span className="text-foreground">{nameOf(side.id)}</span>{" "}
                      {formatElo(side.before)} <span aria-hidden>→</span>
                      <span className="sr-only"> to </span> {formatElo(side.before + side.change)}{" "}
                      (<Delta value={side.change} />)
                    </li>
                  ))}
                </ul>
              )}

              <div className="-ml-3">
                {isDeleted ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={rowBusy}
                    disabled={busy !== null && !rowBusy}
                    onClick={() =>
                      act(m, () => restoreMatch(m.id), `Restored: ${describe(m)}. Ratings recalculated.`)
                    }
                  >
                    {rowBusy ? "Restoring…" : "Restore"}
                  </Button>
                ) : (
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={busy !== null}
                    onClick={() => setDeleting(m)}
                  >
                    Delete
                  </Button>
                )}
              </div>

              {errors[m.id] && (
                <p role="alert" className="text-sm text-loss">
                  {errors[m.id]}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {matches.length > COLLAPSED && (
        <Button
          variant="ghost"
          className="-ml-4"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? "Show fewer" : `Show all ${matches.length} matches`}
        </Button>
      )}

      <Live>
        {announcement && (
          <p role="none" className="sr-only">
            {announcement}
          </p>
        )}
      </Live>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this match?"
        message={
          deleting
            ? `${describe(deleting)}. It drops out of the rankings and stats, and every match after it is recalculated in order. You can restore it from the history.`
            : ""
        }
        confirmLabel="Delete match"
        loading={deleting !== null && busy === deleting.id}
        onConfirm={async () => {
          if (!deleting) return;
          const match = deleting;
          await act(match, () => deleteMatch(match.id), `Deleted: ${describe(match)}. Ratings recalculated.`);
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
      />
    </Section>
  );
}
