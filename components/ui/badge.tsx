import type * as React from "react";
import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-muted text-muted-foreground",
  accent: "bg-accent-subtle text-accent",
  win: "bg-win-subtle text-win",
  loss: "bg-loss-subtle text-loss",
  warn: "bg-warn-subtle text-warn",
} as const;

export type BadgeProps = React.ComponentProps<"span"> & {
  tone?: keyof typeof tones;
};

/** A tiny status label ("Linked", "Shared", "You"). Not a button. */
export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium leading-4",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
