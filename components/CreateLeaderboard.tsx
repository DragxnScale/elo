"use client";

import { useEffect, useRef, useState } from "react";
import {
  createLeaderboard,
  deleteLeaderboard,
  getMyLeaderboards,
} from "@/app/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { formatElo } from "@/components/manage/format";
import { Live } from "@/components/manage/live";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Section } from "@/components/ui/section";
import { ShareCode } from "@/components/ui/share-code";
import { Skeleton } from "@/components/ui/skeleton";
import type { Leaderboard } from "@/lib/types";

type CreateLeaderboardProps = {
  isAuthenticated: boolean;
  onCreated: () => void;
};

const DEFAULT_ELO = "1000";
const MIN_ELO = 100;
const MAX_ELO = 10000;

export function CreateLeaderboard({
  isAuthenticated,
  onCreated,
}: CreateLeaderboardProps) {
  if (!isAuthenticated) {
    return <Notice tone="info">Sign in to create and manage boards.</Notice>;
  }
  // Mounted only while signed in, so signing out and in again starts clean.
  return <CreatePanel onCreated={onCreated} />;
}

function CreatePanel({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [elo, setElo] = useState(DEFAULT_ELO);
  const [errors, setErrors] = useState<{ name?: string; elo?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | undefined>();
  const [created, setCreated] = useState<{ name: string; code: string } | null>(
    null
  );

  const [boards, setBoards] = useState<Leaderboard[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [reloadKey, setReloadKey] = useState(0);

  // `open` and the target snapshot are separate so the message never reads
  // "undefined" while the dialog plays its exit animation.
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Leaderboard | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>();
  const [deletedName, setDeletedName] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const eloRef = useRef<HTMLInputElement>(null);
  const deletedRef = useRef<HTMLParagraphElement>(null);

  // The deleted row (and the button that opened the dialog) is gone, so focus
  // would fall to the page. Land it on the confirmation instead.
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

  /** Reload after a mutation so the caller can wait for fresh data. */
  async function refreshBoards() {
    const result = await getMyLeaderboards();
    if (result.error) {
      setLoadError(result.error);
    } else {
      setLoadError(undefined);
      setBoards(result.leaderboards as Leaderboard[]);
    }
  }

  function retryLoad() {
    setLoaded(false);
    setLoadError(undefined);
    setReloadKey((k) => k + 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const nextErrors: { name?: string; elo?: string } = {};
    if (!name.trim()) nextErrors.name = "Give the board a name.";
    const startingElo = /^\d+$/.test(elo) ? Number(elo) : NaN;
    if (!(startingElo >= MIN_ELO && startingElo <= MAX_ELO)) {
      nextErrors.elo = "Enter a whole number from 100 to 10,000.";
    }
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.elo) {
      (nextErrors.name ? nameRef : eloRef).current?.focus();
      return;
    }

    setSubmitting(true);
    setServerError(undefined);
    setCreated(null);
    setDeletedName(null);
    const result = await createLeaderboard(name, startingElo);
    setSubmitting(false);
    if (result.error || !result.leaderboard) {
      setServerError(result.error ?? "Something went wrong. Try again.");
      return;
    }
    setName("");
    setElo(DEFAULT_ELO);
    setCreated({
      name: result.leaderboard.name,
      code: result.leaderboard.share_code,
    });
    await refreshBoards();
    onCreated();
  }

  function openDelete(board: Leaderboard) {
    setDeleteTarget(board);
    setDeleteError(undefined);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    const result = await deleteLeaderboard(deleteTarget.id);
    if (result.error) {
      setDeleting(false);
      setDeleteOpen(false);
      setDeleteError(result.error);
      return;
    }
    // Keep the dialog up until the list is fresh, so the row never lingers
    // after the dialog has closed.
    await refreshBoards();
    setDeletedName(deleteTarget.name);
    setDeleting(false);
    setDeleteOpen(false);
    onCreated();
  }

  return (
    <div className="space-y-10">
      <Section title="New board">
        <form onSubmit={handleSubmit} noValidate className="max-w-md space-y-4">
          <Field label="Name" error={errors.name}>
            <Input
              ref={nameRef}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors((prev) => ({ ...prev, name: undefined }));
                setServerError(undefined);
                setCreated(null);
              }}
              placeholder="Friday night pool"
              autoComplete="off"
              enterKeyHint="go"
            />
          </Field>
          <Field
            label="Starting ELO"
            hint="New players start here. Default 1000."
            error={errors.elo}
          >
            <Input
              ref={eloRef}
              type="text"
              inputMode="numeric"
              value={elo}
              onChange={(e) => {
                setElo(e.target.value.replace(/\D/g, ""));
                setErrors((prev) => ({ ...prev, elo: undefined }));
                setServerError(undefined);
                setCreated(null);
              }}
              autoComplete="off"
              enterKeyHint="go"
              maxLength={5}
              className="w-36 tabular-nums"
            />
          </Field>
          <div className="pt-2">
            {serverError && (
              <Notice
                tone="error"
                title="Couldn't create the board"
                className="mb-4"
              >
                {serverError}
              </Notice>
            )}
            <Live>
              {created && (
                <Notice
                  role="none"
                  tone="success"
                  title={`“${created.name}” is ready`}
                  className="mb-4"
                >
                  Share code{" "}
                  <span className="font-medium tabular-nums">{created.code}</span>
                  . Add players on the Edit tab.
                </Notice>
              )}
            </Live>
            <Button type="submit" loading={submitting}>
              {submitting ? "Creating…" : "Create board"}
            </Button>
          </div>
        </form>
      </Section>

      {(!loaded || loadError || boards.length > 0 || deletedName) && (
        <Section title="Your boards">
          {deletedName && (
            <p
              ref={deletedRef}
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
          {!loaded ? (
            <div className="space-y-2">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : loadError ? (
            <div className="space-y-3">
              <Notice tone="error" title="Couldn't load your boards">
                {loadError}
              </Notice>
              <Button variant="secondary" onClick={retryLoad}>
                Try again
              </Button>
            </div>
          ) : (
            boards.length > 0 && (
              <ul className="border-t border-border">
                {boards.map((board) => (
                  <li
                    key={board.id}
                    className="flex items-start justify-between gap-x-4 border-b border-border py-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="break-words text-base font-medium text-foreground">
                        {board.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <ShareCode code={board.share_code} />
                        <span className="text-sm tabular-nums text-muted-foreground">
                          Starts at {formatElo(board.starting_elo)} ELO
                        </span>
                      </div>
                    </div>
                    {/* -mt-2 centres the 40px target on the name's first line;
                        -mr-3 / px-3 lets the label meet the column edge. */}
                    <Button
                      variant="danger"
                      className="-mr-3 -mt-2 px-3"
                      aria-label={`Delete ${board.name}`}
                      onClick={() => openDelete(board)}
                    >
                      Delete
                    </Button>
                  </li>
                ))}
              </ul>
            )
          )}
        </Section>
      )}

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
