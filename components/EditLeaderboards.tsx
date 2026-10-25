"use client";

import { useEffect, useRef, useState } from "react";
import { deleteLeaderboard, getMyLeaderboards } from "@/app/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { BoardWorkbench } from "@/components/manage/BoardWorkbench";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Leaderboard } from "@/lib/types";

type EditLeaderboardsProps = {
  isAuthenticated: boolean;
  /** Powers the empty-state action. Without it the action is omitted. */
  onCreateBoard?: () => void;
  /** Called after a board is deleted so the shell can refresh its tabs. */
  onBoardsChanged?: () => void;
};

export function EditLeaderboards({
  isAuthenticated,
  onCreateBoard,
  onBoardsChanged,
}: EditLeaderboardsProps) {
  if (!isAuthenticated) {
    return <Notice tone="info">Sign in to edit boards.</Notice>;
  }
  // Mounted only while signed in, so signing out and in again starts clean.
  return (
    <EditPanel
      onCreateBoard={onCreateBoard}
      onBoardsChanged={onBoardsChanged}
    />
  );
}

function EditPanel({
  onCreateBoard,
  onBoardsChanged,
}: Pick<EditLeaderboardsProps, "onCreateBoard" | "onBoardsChanged">) {
  const [boards, setBoards] = useState<Leaderboard[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // `open` and the snapshot are separate so the message never reads
  // "undefined" while the dialog plays its exit animation.
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>();
  const [deletedName, setDeletedName] = useState<string | null>(null);
  const deletedRef = useRef<HTMLElement | null>(null);

  // The deleted board's workbench (and maybe the whole screen) is gone, so
  // focus would fall to the page. Land it on the confirmation instead.
  useEffect(() => {
    if (deletedName) deletedRef.current?.focus();
  }, [deletedName]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await getMyLeaderboards();
      if (cancelled) return;
      if (result.error) {
        setLoadError(result.error);
      } else {
        setLoadError(undefined);
        setBoards(result.leaderboards as Leaderboard[]);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Derived: the chosen board if it still exists, otherwise the first one.
  const selected = boards.find((b) => b.id === selectedId) ?? boards[0];

  function retryLoad() {
    setLoaded(false);
    setLoadError(undefined);
    setReloadKey((k) => k + 1);
  }

  function openDelete(board: Leaderboard) {
    setDeleteTarget({ id: board.id, name: board.name });
    setDeleteError(undefined);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    const { id, name } = deleteTarget;
    setDeleting(true);
    const result = await deleteLeaderboard(id);
    if (result.error) {
      setDeleting(false);
      setDeleteOpen(false);
      setDeleteError(result.error);
      return;
    }
    // Keep the dialog up until the list is fresh, so the deleted board never
    // lingers on screen after the dialog has closed.
    const refreshed = await getMyLeaderboards();
    setBoards(
      refreshed.error
        ? (prev) => prev.filter((b) => b.id !== id)
        : (refreshed.leaderboards as Leaderboard[])
    );
    setDeletedName(name);
    setDeleting(false);
    setDeleteOpen(false);
    onBoardsChanged?.();
  }

  if (!loaded) {
    return (
      <div className="space-y-10">
        {/* Same height as the label and select they stand in for. */}
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-10 w-full sm:w-72" />
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-3">
        <Notice tone="error" title="Couldn't load your boards">
          {loadError}
        </Notice>
        <Button variant="secondary" onClick={retryLoad}>
          Try again
        </Button>
      </div>
    );
  }

  if (!selected) {
    return (
      <div
        ref={(el) => {
          deletedRef.current = el;
        }}
        tabIndex={-1}
      >
        <EmptyState
          title="No boards yet"
          description={
            deletedName
              ? `Deleted “${deletedName}”. Create a board to add players and record matches.`
              : "Create a board to add players and record matches."
          }
          action={
            onCreateBoard && (
              <Button variant="secondary" onClick={onCreateBoard}>
                Create a board
              </Button>
            )
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <Field label="Board" className="sm:flex-1">
            <Select
              className="sm:max-w-sm"
              value={selected.id}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setDeleteError(undefined);
                setDeletedName(null);
              }}
            >
              {boards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name} ({board.share_code})
                </option>
              ))}
            </Select>
          </Field>
          {/* sm:mb-1.5 offsets the Field's always-mounted error slot so the
              button sits on the select's bottom edge. -ml-3 / px-3 lets the
              label, not the hover tint, meet the column edge on phones. */}
          <Button
            variant="danger"
            className="-ml-3 self-start px-3 sm:-mr-3 sm:ml-0 sm:mb-1.5"
            onClick={() => openDelete(selected)}
          >
            Delete board
          </Button>
        </div>
        {deletedName && (
          <p
            ref={(el) => {
              deletedRef.current = el;
            }}
            role="status"
            tabIndex={-1}
            className="text-sm text-muted-foreground"
          >
            Deleted “{deletedName}”.
          </p>
        )}
        {deleteError && (
          <Notice tone="error" title="Couldn't delete the board">
            {deleteError}
          </Notice>
        )}
      </div>

      <BoardWorkbench key={selected.id} board={selected} />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete leaderboard?"
        message={`“${deleteTarget?.name ?? ""}” will be deleted for good, along with all its players and matches. This can’t be undone.`}
        confirmLabel="Delete board"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
