"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  getBoardsIPlayIn,
  getLeaderboardByCode,
  getMyLeaderboards,
} from "@/app/actions";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { BoardPicker } from "@/components/leaderboard/BoardPicker";
import { OpenByCode } from "@/components/leaderboard/OpenByCode";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { ShareCode } from "@/components/ui/share-code";
import { Skeleton } from "@/components/ui/skeleton";
import { isValidShareCode, normalizeShareCode } from "@/lib/codes";
import type { Leaderboard } from "@/lib/types";

type ViewLeaderboardsProps = {
  isAuthenticated: boolean;
  /** Lets the empty state send the viewer to the create tab. */
  onCreateBoard?: () => void;
};

/** The viewer's boards once fetched: `ok: false` means the request failed. */
type BoardsResult = { ok: true; boards: Leaderboard[] } | { ok: false };

const NO_BOARDS: Leaderboard[] = [];

const INVALID_CODE = "Enter the 6-character code, letters and numbers.";
const CODE_NOT_FOUND = "No board has that code. Check it and try again.";

export function ViewLeaderboards({
  isAuthenticated,
  onCreateBoard,
}: ViewLeaderboardsProps) {
  const headingId = useId();

  const [fetched, setFetched] = useState<BoardsResult | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [external, setExternal] = useState<Leaderboard | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  // Bumped when a lookup starts or is overtaken, so a slow answer is ignored.
  const lookupTicket = useRef(0);

  // Signing in or out makes the fetched list (and the pick made from it) stale.
  const [seenAuth, setSeenAuth] = useState(isAuthenticated);
  if (seenAuth !== isAuthenticated) {
    setSeenAuth(isAuthenticated);
    setFetched(null);
    setSelectedId(null);
  }

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    async function loadBoards() {
      try {
        const [owned, playing] = await Promise.all([
          getMyLeaderboards(),
          getBoardsIPlayIn(),
        ]);
        if (cancelled) return;
        if (owned.error) {
          setFetched({ ok: false });
          return;
        }
        // Owned boards first, then boards the viewer plays in, once each.
        const seen = new Set<string>();
        const boards = [
          ...(owned.leaderboards as Leaderboard[]),
          ...playing.leaderboards,
        ].filter((board) => !seen.has(board.id) && !!seen.add(board.id));
        setFetched({ ok: true, boards });
      } catch {
        if (!cancelled) setFetched({ ok: false });
      }
    }

    loadBoards();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, attempt]);

  const boards =
    isAuthenticated && fetched?.ok ? fetched.boards : NO_BOARDS;
  const boardsLoading = isAuthenticated && fetched === null;
  const boardsFailed = isAuthenticated && fetched?.ok === false;

  // The picked board if it still exists, otherwise the first one.
  const ownBoard = external
    ? null
    : (boards.find((board) => board.id === selectedId) ?? boards[0] ?? null);
  const active = external ?? ownBoard;
  const showPicker = boards.length >= 2 || (boards.length >= 1 && !!external);
  const hasNoBoards =
    isAuthenticated && fetched?.ok === true && boards.length === 0 && !external;

  function retryBoards() {
    setFetched(null);
    setAttempt((n) => n + 1);
  }

  function pickBoard(id: string) {
    lookupTicket.current++;
    setLookingUp(false);
    setExternal(null);
    setSelectedId(id);
    setCodeError(null);
  }

  function changeCode(value: string) {
    // Editing the code abandons a lookup for the old one.
    lookupTicket.current++;
    setLookingUp(false);
    setCodeInput(value);
    setCodeError(null);
  }

  async function openByCode() {
    const code = normalizeShareCode(codeInput);
    if (!isValidShareCode(code)) {
      setCodeError(INVALID_CODE);
      return;
    }
    const ticket = ++lookupTicket.current;
    setLookingUp(true);
    setCodeError(null);

    let board: Leaderboard | null = null;
    try {
      const result = await getLeaderboardByCode(code);
      if (!result.error && result.leaderboard) {
        board = result.leaderboard as Leaderboard;
      }
    } catch {
      board = null;
    }
    if (ticket !== lookupTicket.current) return;

    setLookingUp(false);
    if (!board) {
      setExternal(null);
      setCodeError(CODE_NOT_FOUND);
      return;
    }
    // A code for one of the viewer's own boards just selects it.
    const own = boards.find((candidate) => candidate.id === board.id);
    if (own) {
      setExternal(null);
      setSelectedId(own.id);
    } else {
      setExternal(board);
      setSelectedId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        {!isAuthenticated && (
          <Notice tone="info">
            Sign in to see your boards. You can still open any board with its
            share code.
          </Notice>
        )}

        {boardsLoading && (
          <div aria-busy="true">
            <p role="status" className="sr-only">
              Loading your boards
            </p>
            <Skeleton className="h-10 w-48" />
          </div>
        )}

        {boardsFailed && (
          <div className="space-y-3">
            <Notice tone="error" title="Couldn't load your boards">
              Check your connection, then try again.
            </Notice>
            <Button variant="secondary" size="sm" onClick={retryBoards}>
              Try again
            </Button>
          </div>
        )}

        {showPicker && (
          <BoardPicker
            boards={boards}
            selectedId={external ? null : (ownBoard?.id ?? null)}
            onSelect={pickBoard}
          />
        )}

        <OpenByCode
          value={codeInput}
          error={codeError}
          loading={lookingUp}
          onChange={changeCode}
          onSubmit={openByCode}
        />
      </div>

      {hasNoBoards && (
        <EmptyState
          title="No boards yet"
          description={
            onCreateBoard
              ? "Create one, or open a friend's board with its code."
              : "Create one on the Create tab, or open a friend's board with its code."
          }
          action={
            onCreateBoard ? (
              <Button variant="primary" onClick={onCreateBoard}>
                Create a board
              </Button>
            ) : undefined
          }
        />
      )}

      <p role="status" className="sr-only">
        {active ? `Showing ${active.name}` : ""}
      </p>

      {active && (
        <section aria-labelledby={headingId} className="space-y-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <h2
                id={headingId}
                className="min-w-0 text-2xl font-semibold tracking-tight wrap-anywhere"
              >
                {active.name}
              </h2>
              {external && <Badge>Shared</Badge>}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 text-sm">
              <span className="text-muted-foreground">Share code</span>
              <ShareCode code={active.share_code} />
            </div>
          </div>
          <LeaderboardTable
            leaderboardId={active.id}
            emptyDescription={
              external
                ? "The owner hasn't added anyone yet."
                : "Add players on the Edit tab."
            }
          />
        </section>
      )}
    </div>
  );
}
