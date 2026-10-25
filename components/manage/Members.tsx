"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  adjustRating,
  getBoardMembers,
  linkPlayerToAccount,
  removePlayer,
  restorePlayer,
  setPlayerRole,
} from "@/app/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { formatElo } from "@/components/manage/format";
import { Live } from "@/components/manage/live";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Section } from "@/components/ui/section";
import { Delta } from "@/components/ui/stat";
import type { BoardMember, BoardRole } from "@/lib/types";

type MembersProps = {
  leaderboardId: string;
  /** The viewer's role on this board. */
  role: BoardRole;
  /** The board owner's account: admins can't remove the owner's player. */
  ownerId: string;
  /** Bump to reload (after a match, a new player...). */
  refreshKey: number;
  /** Reload players and rankings after a change here. */
  onChanged: () => Promise<void> | void;
};

const onBoard = (m: BoardMember) => !m.status || m.status === "active";

/**
 * Who is on the board and what they can do. The owner promotes admins, sets
 * ratings, links accounts and removes or restores anyone; admins can remove
 * regular players. The database enforces all of this; the buttons only show
 * what will work.
 */
export function Members({ leaderboardId, role, ownerId, refreshKey, onChanged }: MembersProps) {
  const isOwner = role === "owner";
  const [members, setMembers] = useState<BoardMember[] | null>(null);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [announcement, setAnnouncement] = useState("");
  const [linking, setLinking] = useState<string | null>(null);
  const [linkDraft, setLinkDraft] = useState("");
  const [removing, setRemoving] = useState<BoardMember | null>(null);
  const [rating, setRating] = useState<BoardMember | null>(null);
  const latest = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const request = ++latest.current;
    (async () => {
      const result = await getBoardMembers(leaderboardId);
      if (cancelled || request !== latest.current) return;
      if (result.error) setLoadError(result.error);
      else {
        setLoadError(undefined);
        setMembers(result.members);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [leaderboardId, refreshKey]);

  /** Run one member action, then reload everything that depends on it. */
  async function act(
    member: BoardMember,
    run: () => Promise<{ error?: string }>,
    done: string
  ) {
    setBusy(member.id);
    setErrors((e) => ({ ...e, [member.id]: undefined }));
    try {
      const result = await run();
      if (result.error) {
        setErrors((e) => ({ ...e, [member.id]: result.error }));
        return false;
      }
      setAnnouncement(done);
      await onChanged();
      return true;
    } catch {
      // Expired session or network: say so instead of spinning forever.
      setErrors((e) => ({
        ...e,
        [member.id]: "Couldn't reach the server. Sign in again if you've been away, then retry.",
      }));
      return false;
    } finally {
      setBusy(null);
    }
  }

  if (loadError) {
    return (
      <Section title="Members">
        <p role="alert" className="text-sm text-loss">
          Couldn&rsquo;t load the members: {loadError}
        </p>
      </Section>
    );
  }
  if (!members) return null;

  const active = members.filter(onBoard);
  const away = members.filter((m) => !onBoard(m));

  return (
    <Section
      title="Members"
      description={
        isOwner
          ? "People who enter the board's code join it here. Admins can record and undo matches, add players and remove regular players."
          : "You're an admin: you can record matches, add players and remove regular players."
      }
    >
      <ul className="border-t border-border">
        {active.map((m) => {
          const isAdmin = m.role === "admin";
          const canRemove = isOwner || (!isAdmin && m.user_id !== ownerId);
          const rowBusy = busy === m.id;
          return (
            <li key={m.id} className="space-y-2 border-b border-border py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link
                      href={`/p/${m.id}`}
                      className="break-words text-base font-medium text-foreground hover:underline"
                    >
                      {m.name}
                    </Link>
                    {isAdmin && <Badge tone="accent">Admin</Badge>}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {m.username ? `@${m.username}` : "No account linked"}
                  </p>
                </div>
                <span className="shrink-0 text-base font-semibold tabular-nums text-foreground">
                  {formatElo(m.elo)}
                </span>
              </div>

              <div className="-ml-3 flex flex-wrap items-center gap-x-1 gap-y-1">
                {isOwner && m.user_id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={rowBusy}
                    onClick={() =>
                      act(
                        m,
                        () => setPlayerRole(m.id, isAdmin ? "player" : "admin"),
                        isAdmin ? `${m.name} is no longer an admin.` : `${m.name} is now an admin.`
                      )
                    }
                  >
                    {isAdmin ? "Remove admin" : "Make admin"}
                  </Button>
                )}
                {isOwner && (
                  <Button variant="ghost" size="sm" disabled={rowBusy} onClick={() => setRating(m)}>
                    Set rating
                  </Button>
                )}
                {isOwner && !m.user_id && linking !== m.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={rowBusy}
                    onClick={() => {
                      setLinking(m.id);
                      setLinkDraft("");
                    }}
                  >
                    Link account
                  </Button>
                )}
                {isOwner && m.user_id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={rowBusy}
                    onClick={() =>
                      act(m, () => linkPlayerToAccount(m.id, null), `Unlinked ${m.name}.`)
                    }
                  >
                    Unlink account
                  </Button>
                )}
                {canRemove && (
                  <Button variant="danger" size="sm" disabled={rowBusy} onClick={() => setRemoving(m)}>
                    Remove
                  </Button>
                )}
              </div>

              {linking === m.id && (
                <form
                  noValidate
                  className="flex items-start gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!linkDraft.trim() || rowBusy) return;
                    const ok = await act(
                      m,
                      () => linkPlayerToAccount(m.id, linkDraft),
                      `Linked ${m.name} to @${linkDraft.trim()}.`
                    );
                    if (ok) setLinking(null);
                  }}
                >
                  <Field label={`Account username for ${m.name}`} hideLabel className="min-w-0 flex-1 sm:max-w-56">
                    <Input
                      autoFocus
                      value={linkDraft}
                      onChange={(e) => setLinkDraft(e.target.value)}
                      placeholder="username"
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      enterKeyHint="go"
                    />
                  </Field>
                  <Button type="submit" variant="secondary" loading={rowBusy} disabled={!linkDraft.trim()}>
                    Link
                  </Button>
                  <Button variant="ghost" onClick={() => setLinking(null)}>
                    Cancel
                  </Button>
                </form>
              )}

              {errors[m.id] && (
                <p role="alert" className="text-sm text-loss">
                  {errors[m.id]}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {isOwner && away.length > 0 && (
        <div className="space-y-2 pt-2">
          <h3 className="text-sm font-medium text-foreground">Removed or left</h3>
          <ul className="border-t border-border">
            {away.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border py-2.5"
              >
                <div className="min-w-0">
                  <p className="break-words text-sm text-foreground">{m.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {m.status === "removed" ? "Removed: can't rejoin with the code" : "Left the board"}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={busy === m.id}
                  onClick={() => act(m, () => restorePlayer(m.id), `${m.name} is back on the board.`)}
                >
                  Restore
                </Button>
                {errors[m.id] && (
                  <p role="alert" className="w-full text-sm text-loss">
                    {errors[m.id]}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Live>
        {announcement && (
          <p role="none" className="sr-only">
            {announcement}
          </p>
        )}
      </Live>

      <ConfirmDialog
        open={removing !== null}
        title={`Remove ${removing?.name ?? "player"}?`}
        message={
          isOwner
            ? "They leave the rankings and can't rejoin with the code until you restore them. Their matches stay in everyone's history."
            : "They leave the rankings and can't rejoin with the code unless the owner restores them. Their matches stay in everyone's history."
        }
        confirmLabel="Remove"
        loading={removing !== null && busy === removing.id}
        onConfirm={async () => {
          if (!removing) return;
          const member = removing;
          await act(member, () => removePlayer(member.id), `Removed ${member.name}.`);
          setRemoving(null);
        }}
        onCancel={() => setRemoving(null)}
      />

      <SetRatingDialog
        member={rating}
        onClose={() => setRating(null)}
        onSave={async (member, value, reason) => {
          const ok = await act(
            member,
            () => adjustRating(member.id, value, reason),
            `${member.name}'s rating is now ${formatElo(value)}.`
          );
          if (ok) setRating(null);
          return ok;
        }}
        error={rating ? errors[rating.id] : undefined}
        busy={rating !== null && busy === rating.id}
      />
    </Section>
  );
}

function SetRatingDialog({
  member,
  onClose,
  onSave,
  error,
  busy,
}: {
  member: BoardMember | null;
  onClose: () => void;
  onSave: (member: BoardMember, value: number, reason: string) => Promise<boolean>;
  error?: string;
  busy: boolean;
}) {
  // The form remounts per member (key below), so drafts start fresh.
  return (
    <Dialog
      open={member !== null}
      onClose={() => {
        if (!busy) onClose();
      }}
      title={member ? `Set ${member.name}'s rating` : "Set rating"}
      description="For corrections and fresh starts. Recorded matches don't change, and matches played before this can no longer be undone."
    >
      {member && (
        <RatingForm key={member.id} member={member} onSave={onSave} onCancel={onClose} error={error} busy={busy} />
      )}
    </Dialog>
  );
}

function RatingForm({
  member,
  onSave,
  onCancel,
  error,
  busy,
}: {
  member: BoardMember;
  onSave: (member: BoardMember, value: number, reason: string) => Promise<boolean>;
  onCancel: () => void;
  error?: string;
  busy: boolean;
}) {
  const [draft, setDraft] = useState(String(member.elo));
  const [reason, setReason] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const value = /^\d+$/.test(draft.trim()) ? Number(draft.trim()) : null;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (value === null || value > 100000) {
          setFieldError("Enter a whole number from 0 to 100000.");
          return;
        }
        await onSave(member, value, reason);
      }}
    >
      <Field
        label="New rating"
        hint={
          value !== null && value !== member.elo ? (
            <span className="tabular-nums">
              {formatElo(member.elo)} → {formatElo(value)} (<Delta value={value - member.elo} />)
            </span>
          ) : (
            `Currently ${formatElo(member.elo)}`
          )
        }
        error={fieldError}
      >
        <Input
          autoFocus
          inputMode="numeric"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value.replace(/[^\d]/g, "").slice(0, 6));
            setFieldError(undefined);
          }}
          className="tabular-nums"
        />
      </Field>
      <Field label="Reason" optional hint="Kept in the board's history of rating changes.">
        <Input value={reason} maxLength={140} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Season reset" />
      </Field>
      {error && (
        <p role="alert" className="text-sm text-loss">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={busy} disabled={value === null || value === member.elo}>
          Save rating
        </Button>
      </div>
    </form>
  );
}
