"use client";

import { useEffect, useRef, useState } from "react";
import { linkPlayerToAccount } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Section } from "@/components/ui/section";
import type { Player } from "@/lib/types";

type LinkedAccountsProps = {
  players: Player[];
  /**
   * Reload players after a link or unlink. The row keeps its busy state until
   * the returned promise settles, so it flips shape without flashing empty.
   */
  onChanged: () => Promise<void> | void;
};

type Busy = "link" | "unlink";

/** Where focus should land once a row has flipped to its new shape. */
type FocusTarget = { playerId: string; to: "unlink" | "input" };

export function LinkedAccounts({ players, onChanged }: LinkedAccountsProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, Busy | undefined>>({});
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const listRef = useRef<HTMLUListElement>(null);
  const focusAfter = useRef<FocusTarget | null>(null);

  // The button or input that held focus unmounts when its row flips. Hand
  // focus to the control that replaces it, as soon as that control exists.
  useEffect(() => {
    const target = focusAfter.current;
    if (!target) return;
    const row = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>("li") ?? []
    ).find((li) => li.dataset.playerId === target.playerId);
    // Do not pull focus from someone who has already moved on.
    const active = document.activeElement;
    if (active && active !== document.body && !row?.contains(active)) {
      focusAfter.current = null;
      return;
    }
    const next = row?.querySelector<HTMLElement>(
      target.to === "unlink" ? "[data-unlink]" : "input"
    );
    if (!next) return;
    next.focus();
    focusAfter.current = null;
  });

  async function save(player: Player, username: string | null) {
    focusAfter.current = null;
    setBusy((b) => ({ ...b, [player.id]: username === null ? "unlink" : "link" }));
    setErrors((e) => ({ ...e, [player.id]: undefined }));
    const result = await linkPlayerToAccount(player.id, username);
    if (result.error) {
      setBusy((b) => ({ ...b, [player.id]: undefined }));
      setErrors((e) => ({ ...e, [player.id]: result.error }));
      return;
    }
    focusAfter.current = {
      playerId: player.id,
      to: username === null ? "input" : "unlink",
    };
    await onChanged();
    setBusy((b) => ({ ...b, [player.id]: undefined }));
    setDrafts((d) => {
      const next = { ...d };
      delete next[player.id];
      return next;
    });
  }

  return (
    <Section
      title="Linked accounts"
      description="Link a player to someone’s account so this board shows up in their stats."
    >
      <ul ref={listRef} className="border-t border-border">
        {players.map((pl) => {
          const draft = drafts[pl.id] ?? "";
          const state = busy[pl.id];
          const error = errors[pl.id];
          return (
            <li
              key={pl.id}
              data-player-id={pl.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border py-3"
            >
              <span className="min-w-0 flex-1 basis-40 break-words text-base text-foreground">
                {pl.name}
              </span>
              {pl.user_id ? (
                <>
                  <Badge tone="win">Linked</Badge>
                  {/* px-3 / -mr-3: the label, not the hover tint, meets the
                      column edge. */}
                  <Button
                    variant="ghost"
                    data-unlink
                    className="-mr-3 px-3"
                    aria-label={`Unlink ${pl.name}`}
                    loading={state === "unlink"}
                    onClick={() => save(pl, null)}
                  >
                    {state === "unlink" ? "Unlinking…" : "Unlink"}
                  </Button>
                  {error && (
                    <p role="alert" className="w-full text-sm text-loss">
                      {error}
                    </p>
                  )}
                </>
              ) : (
                <form
                  noValidate
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (draft.trim() && !state) save(pl, draft);
                  }}
                  className="flex w-full items-start gap-2 sm:w-auto"
                >
                  <Field
                    label={`Account username for ${pl.name}`}
                    hideLabel
                    error={error}
                    className="min-w-0 flex-1 sm:w-44 sm:flex-none"
                  >
                    <Input
                      value={draft}
                      readOnly={state === "link"}
                      onChange={(e) => {
                        const value = e.target.value;
                        setDrafts((d) => ({ ...d, [pl.id]: value }));
                        setErrors((er) => ({ ...er, [pl.id]: undefined }));
                      }}
                      placeholder="username"
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      enterKeyHint="go"
                    />
                  </Field>
                  <Button
                    type="submit"
                    variant="secondary"
                    aria-label={`Link ${pl.name}`}
                    disabled={!draft.trim()}
                    loading={state === "link"}
                  >
                    {state === "link" ? "Linking…" : "Link"}
                  </Button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
