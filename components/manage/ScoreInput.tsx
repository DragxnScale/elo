"use client";

import { useRef } from "react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { sanitizeIntegerInput } from "@/lib/match-scores";

type ScoreInputProps = {
  /** "Player 1" / "Player 2": names the control for screen readers. */
  playerLabel: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  enterKeyHint?: React.ComponentProps<"input">["enterKeyHint"];
  /** Runs on Enter, so the keypad's Next / Done key does what it says. */
  onEnter?: () => void;
};

/**
 * Points field with a sign toggle. iOS numeric keypads have no minus key, so
 * without the toggle negative scores would be unreachable on a phone. The
 * input stays the single source of truth; the toggle only edits its string.
 * Candidate primitive.
 */
export function ScoreInput({
  playerLabel,
  value,
  onChange,
  error,
  inputRef,
  enterKeyHint = "next",
  onEnter,
}: ScoreInputProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const negative = value.startsWith("-");

  function toggleSign(e: React.MouseEvent<HTMLButtonElement>) {
    onChange(sanitizeIntegerInput(negative ? value.slice(1) : `-${value}`));
    // A tap leaves the keypad ready for digits. A keyboard press (detail 0)
    // keeps focus on the toggle so the user does not lose their place.
    if (e.detail > 0) rowRef.current?.querySelector("input")?.focus();
  }

  return (
    <Field
      label={
        <>
          Points<span className="sr-only"> for {playerLabel}</span>
        </>
      }
      error={error}
    >
      {(control) => (
        <div ref={rowRef} className="flex gap-2">
          <Input
            {...control}
            ref={inputRef}
            size="lg"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            enterKeyHint={enterKeyHint}
            // Six digits and a sign: far beyond any real score, short of
            // numbers that would break the preview.
            maxLength={7}
            value={value}
            onChange={(e) => onChange(sanitizeIntegerInput(e.target.value))}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.nativeEvent.isComposing || !onEnter) {
                return;
              }
              e.preventDefault();
              onEnter();
            }}
            className="min-w-0 flex-1 text-lg font-medium tabular-nums"
          />
          <Button
            variant="secondary"
            size="icon"
            className="size-12 text-lg aria-pressed:border-foreground aria-pressed:bg-muted"
            aria-pressed={negative}
            aria-label={`Negative score for ${playerLabel}`}
            // Keep the input focused (and the keypad open) while tapping.
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggleSign}
          >
            −
          </Button>
        </div>
      )}
    </Field>
  );
}
