"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type FieldControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

export type FieldProps = {
  label: React.ReactNode;
  /** Quiet help under the control. */
  hint?: React.ReactNode;
  /** Names the problem and the way out. Announced politely when it appears. */
  error?: React.ReactNode;
  /** Appends "(optional)" to the label. Required is the default; do not mark it. */
  optional?: boolean;
  /** Visually hide the label (it stays for screen readers). */
  hideLabel?: boolean;
  className?: string;
  /**
   * A single control element (id / aria-describedby / aria-invalid are
   * injected), or a function receiving those props for wrapped controls.
   */
  children:
    | React.ReactElement<Record<string, unknown>>
    | ((control: FieldControlProps) => React.ReactNode);
};

export function Field({
  label,
  hint,
  error,
  optional,
  hideLabel,
  className,
  children,
}: FieldProps) {
  const uid = React.useId();
  const id = `${uid}-control`;
  const hintId = `${uid}-hint`;
  const errorId = `${uid}-error`;

  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") ||
    undefined;

  const control: FieldControlProps = {
    id,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className={cn(
          "text-sm font-medium text-foreground",
          hideLabel && "sr-only"
        )}
      >
        {label}
        {optional && (
          <span className="ml-1 font-normal text-muted-foreground">
            (optional)
          </span>
        )}
      </label>
      {typeof children === "function"
        ? children(control)
        : React.cloneElement(children, control)}
      {hint && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {/* Always mounted so assistive tech sees the text appear. */}
      <div id={errorId} aria-live="polite">
        {error && <p className="text-sm text-loss">{error}</p>}
      </div>
    </div>
  );
}
