"use client";

import { useEffect, useRef, useState } from "react";
import { getPlayers } from "@/app/actions";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { AddPlayer } from "@/components/manage/AddPlayer";
import { LastMatch } from "@/components/manage/LastMatch";
import { Members } from "@/components/manage/Members";
import { RecordMatch } from "@/components/manage/RecordMatch";
import { Section } from "@/components/ui/section";
import type { BoardRole, Leaderboard, Player } from "@/lib/types";

/**
 * Everything you do to one board. Render with `key={board.id}` so all form
 * state (selections, scores, drafts, preview, errors) resets on a board switch
 * without any effect.
 */
export function BoardWorkbench({
  board,
  role,
}: {
  board: Leaderboard;
  /** Owner or admin: both record matches and add players; owner-only controls sit in Members. */
  role: BoardRole;
}) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [playersLoaded, setPlayersLoaded] = useState(false);
  const [playersError, setPlayersError] = useState<string | undefined>();
  const [tableKey, setTableKey] = useState(0);
  // Only the newest request may write, so a slow reply never overwrites a
  // fresher one.
  const latest = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const request = ++latest.current;
    (async () => {
      const result = await getPlayers(board.id);
      if (cancelled || request !== latest.current) return;
      setPlayers(result.players as Player[]);
      setPlayersError(result.error);
      setPlayersLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [board.id]);

  /**
   * Reload players after a change. Returns when the new list is in place, so
   * a row can keep its busy state until it flips to its new shape instead of
   * flashing empty.
   */
  async function refreshPlayers() {
    const request = ++latest.current;
    const result = await getPlayers(board.id);
    if (request !== latest.current) return;
    if (!result.error) setPlayers(result.players as Player[]);
    setPlayersError(result.error);
    setPlayersLoaded(true);
  }

  async function refreshPlayersAndTable() {
    setTableKey((k) => k + 1);
    await refreshPlayers();
  }

  return (
    <div className="space-y-10">
      <Section title="Rankings">
        <LeaderboardTable
          key={tableKey}
          leaderboardId={board.id}
          shareCode={board.share_code}
          emptyDescription="Add the first player below."
        />
      </Section>
      <RecordMatch
        players={players}
        playersLoaded={playersLoaded}
        loadError={playersError}
        leaderboardId={board.id}
        onRetry={refreshPlayers}
        onRecorded={refreshPlayersAndTable}
      />
      <LastMatch
        leaderboardId={board.id}
        players={players}
        refreshKey={tableKey}
        onUndone={refreshPlayersAndTable}
      />
      <AddPlayer
        leaderboardId={board.id}
        onAdded={refreshPlayersAndTable}
        canLink={role === "owner"}
      />
      <Members
        leaderboardId={board.id}
        role={role}
        ownerId={board.user_id}
        refreshKey={tableKey}
        onChanged={refreshPlayersAndTable}
      />
    </div>
  );
}
