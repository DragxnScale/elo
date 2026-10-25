"use client";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { normalizeShareCode } from "@/lib/codes";

type OpenByCodeProps = {
  value: string;
  error: string | null;
  loading: boolean;
  /** Receives the already-normalised value (A-Z and 0-9, at most 6 characters). */
  onChange: (value: string) => void;
  onSubmit: () => void;
};

/**
 * Open any board with its share code. A real form, so Enter submits.
 * State lives in the parent, which also clears the error when a board is picked.
 */
export function OpenByCode({
  value,
  error,
  loading,
  onChange,
  onSubmit,
}: OpenByCodeProps) {
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Field
        label="Open a board with a code"
        hint={error ? undefined : "Ask the board owner for the 6-character code."}
        error={error}
        // The error replaces the hint and its flex gap; keep the height steady.
        className={error ? "pb-1.5" : undefined}
      >
        {(control) => (
          <div className="flex items-center gap-2">
            <Input
              {...control}
              value={value}
              onChange={(event) =>
                onChange(normalizeShareCode(event.target.value).slice(0, 6))
              }
              maxLength={6}
              placeholder="ABC123"
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              className="min-w-0 max-w-44 flex-1 font-mono uppercase tracking-[0.18em]"
            />
            <Button type="submit" variant="secondary" loading={loading}>
              {loading ? "Opening…" : "Open"}
            </Button>
          </div>
        )}
      </Field>
    </form>
  );
}
