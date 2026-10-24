"use client";

import { useRef, useState } from "react";
import { addPlayer } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Section } from "@/components/ui/section";

type AddPlayerProps = {
  leaderboardId: string;
  /** Reload players and refresh the rankings table. */
  onAdded: () => void;
};

export function AddPlayer({ leaderboardId, onAdded }: AddPlayerProps) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [serverError, setServerError] = useState<string | undefined>();
  const [added, setAdded] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Enter a name for the player.");
      nameRef.current?.focus();
      return;
    }
    setSubmitting(true);
    setServerError(undefined);
    setAdded(null);
    const result = await addPlayer(leaderboardId, name, username);
    setSubmitting(false);
    if (result.error) {
      setServerError(result.error);
      return;
    }
    setName("");
    setUsername("");
    setAdded(`Added ${trimmed}.`);
    onAdded();
    // Adding several players in a row is the normal flow.
    nameRef.current?.focus();
  }

  return (
    <Section title="Add player">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="grid gap-4 sm:grid-cols-2"
      >
        <Field label="Name" error={nameError}>
          <Input
            ref={nameRef}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError(undefined);
              setServerError(undefined);
              setAdded(null);
            }}
            autoComplete="off"
            autoCapitalize="words"
            spellCheck={false}
            enterKeyHint="go"
          />
        </Field>
        <Field
          label="Account username"
          optional
          hint="Link to an account so this board shows in their stats."
        >
          <Input
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setServerError(undefined);
              setAdded(null);
            }}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
          />
        </Field>
        <div className="space-y-3 sm:col-span-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button type="submit" variant="secondary" loading={submitting}>
              {submitting ? "Adding…" : "Add player"}
            </Button>
            {/* Always mounted so the confirmation is announced; it sits beside
                the button, where the eye already is. */}
            <p role="status" className="min-w-0 break-words text-sm text-muted-foreground">
              {added}
            </p>
          </div>
          {serverError && (
            <Notice tone="error" title="Couldn't add the player">
              {serverError}
            </Notice>
          )}
        </div>
      </form>
    </Section>
  );
}
