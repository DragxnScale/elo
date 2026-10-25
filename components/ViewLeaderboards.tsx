"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  getBoardsIPlayIn,
  getLeaderboardByCode,
  getMyLeaderboards,
  getMyPlayer,
  joinBoardByCode,
  leaveBoard,
} from "@/app/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
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
import type { Leaderboard, Player } from "@/lib/types";

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

/** What happened when a code was entered, shown above the board. */
type CodeNotice = {
  tone: "success" | "info" | "warning";
  title: string;
  text?: string;
};

/** A code from an invite link (/?code=ABC123), read once on the client. */
function codeFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const code = normalizeShareCode(
    new URLSearchParams(window.location.search).get("code") ?? ""
  );
  return isValidShareCode(code) ? code : null;
}

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
  const [notice, setNotice] = useState<CodeNotice | null>(null);
  // Bumped when a lookup starts or is overtaken, so a slow answer is ignored.
  const lookupTicket = useRef(0);
  // Only used inside effects, so server and client render the same markup.
  const [linkCode] = useState(codeFromUrl);
  const linkHandled = useRef(false);
  // A board opened while signed out; joined as soon as the viewer signs in.
  const pendingJoin = useRef<string | null>(null);

  // The viewer's own player on the shown board (for "Leave board").
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);
  const [membershipKey, setMembershipKey] = useState(0);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | undefined>();

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

  const activeId = active?.id ?? null;
  useEffect(() => {
    if (!isAuthenticated || !activeId) return;
    let cancelled = false;
    (async () => {
      const { player } = await getMyPlayer(activeId);
      if (!cancelled) setMyPlayer(player);
    })();
    return () => {
      cancelled = true;
      setMyPlayer(null);
    };
  }, [isAuthenticated, activeId, membershipKey]);

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
    setNotice(null);
  }

  function changeCode(value: string) {
    // Editing the code abandons a lookup for the old one.
    lookupTicket.current++;
    setLookingUp(false);
    setCodeInput(value);
    setCodeError(null);
  }

  function openByCode() {
    const code = normalizeShareCode(codeInput);
    if (!isValidShareCode(code)) {
      setCodeError(INVALID_CODE);
      return;
    }
    void lookUp(code);
  }

  /**
   * Open the board with this code. Signed in, that also joins it: you're
   * added as a player linked to your account. A board you already have is
   * just selected.
   */
  async function lookUp(code: string) {
    const ticket = ++lookupTicket.current;
    setCodeInput(code);
    setLookingUp(true);
    setCodeError(null);
    setNotice(null);

    const own = boards.find((candidate) => candidate.share_code === code);
    if (own) {
      setLookingUp(false);
      setExternal(null);
      setSelectedId(own.id);
      return;
    }

    let viewOnlyReason: string | null = null;
    if (isAuthenticated) {
      const joined = await joinBoardByCode(code).catch(() => ({
        error: "Couldn't join right now. Try again.",
      }));
      if (ticket !== lookupTicket.current) return;
      if (!("error" in joined)) {
        const board = joined.leaderboard;
        setFetched((prev) =>
          prev?.ok && !prev.boards.some((b) => b.id === board.id)
            ? { ok: true, boards: [...prev.boards, board] }
            : prev
        );
        setExternal(null);
        setSelectedId(board.id);
        setMembershipKey((k) => k + 1);
        setLookingUp(false);
        if (joined.status === "joined") {
          setNotice({
            tone: "success",
            title: `You joined ${board.name}`,
            text: `You're on the rankings at ${board.starting_elo}. Matches you play will count toward your stats.`,
          });
        } else if (joined.status === "rejoined") {
          setNotice({
            tone: "success",
            title: `Welcome back to ${board.name}`,
            text: "Your rating and match history are where you left them.",
          });
        }
        return;
      }
      if (joined.error === "Leaderboard not found.") {
        setLookingUp(false);
        setExternal(null);
        setCodeError(CODE_NOT_FOUND);
        return;
      }
      // Can't join (removed, or the database needs updating): still show it.
      viewOnlyReason = joined.error;
    }

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
    setExternal(board);
    setSelectedId(null);
    if (!isAuthenticated) pendingJoin.current = code;
    setNotice(
      viewOnlyReason
        ? { tone: "warning", title: "You can view this board but not join it", text: viewOnlyReason }
        : {
            tone: "info",
            title: "Sign in to join this board",
            text: "Sign in or create an account and you'll be added to the rankings.",
          }
    );
  }

  // Invite link, or a board opened before signing in: open (and join) it once
  // the viewer's own boards are known, so a code for a board they already
  // have just selects it.
  const boardsKnown = !isAuthenticated || fetched !== null;
  useEffect(() => {
    if (!boardsKnown) return;
    let code: string | null = null;
    if (linkCode && !linkHandled.current) {
      linkHandled.current = true;
      window.history.replaceState(null, "", window.location.pathname);
      code = linkCode;
    } else if (isAuthenticated && pendingJoin.current) {
      code = pendingJoin.current;
      pendingJoin.current = null;
    }
    if (!code) return;
    const next = code;
    // Deferred so the lookup's state updates happen outside the effect. Not
    // cancelled on re-render: it must run exactly once, and lookUp ignores
    // answers that a newer lookup has overtaken.
    setTimeout(() => void lookUp(next), 0);
  });

  async function confirmLeave() {
    if (!active || leaving) return;
    const board = active;
    setLeaving(true);
    setLeaveError(undefined);
    const result = await leaveBoard(board.id);
    setLeaving(false);
    setLeaveOpen(false);
    if (result.error) {
      setLeaveError(result.error);
      return;
    }
    setMembershipKey((k) => k + 1);
    setNotice({
      tone: "info",
      title: `You left ${board.name}`,
      text: "Your rating and history are kept. Enter the code again to rejoin.",
    });
    // Reload the list: the board drops out unless you own it.
    setExternal(null);
    setSelectedId(null);
    setFetched(null);
    setAttempt((n) => n + 1);
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

      <div role="status">
        {notice && (
          <Notice tone={notice.tone} title={notice.title} role="none">
            {notice.text}
          </Notice>
        )}
        <span className="sr-only">{active ? `Showing ${active.name}` : ""}</span>
      </div>

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
            {myPlayer && !external && (
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3"
                onClick={() => {
                  setLeaveError(undefined);
                  setLeaveOpen(true);
                }}
              >
                Leave board
              </Button>
            )}
            {leaveError && (
              <Notice tone="error" title="Couldn't leave the board">
                {leaveError}
              </Notice>
            )}
          </div>
          <LeaderboardTable
            key={`${active.id}:${membershipKey}`}
            leaderboardId={active.id}
            emptyDescription={
              external
                ? "No one is on this board yet."
                : "Share the code: people who enter it join the board."
            }
          />
        </section>
      )}

      <ConfirmDialog
        open={leaveOpen}
        title={`Leave ${active?.name ?? "this board"}?`}
        message="You'll drop off the rankings. Your rating and match history are kept, and entering the code again brings you back."
        confirmLabel="Leave board"
        loading={leaving}
        onConfirm={confirmLeave}
        onCancel={() => setLeaveOpen(false)}
      />
    </div>
  );
}
