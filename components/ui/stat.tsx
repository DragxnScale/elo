import type * as React from "react";
import { cn, formatSigned } from "@/lib/utils";

export type StatGroupProps = React.ComponentProps<"dl"> & {
  /** Columns from the sm breakpoint up. Two on phones always. */
  columns?: 2 | 3 | 4;
};

const cols = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" } as const;

/** A <dl> of Stat items: no boxes, just type and a hairline above. */
export function StatGroup({ columns = 4, className, ...props }: StatGroupProps) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-x-6 gap-y-6 border-t border-border pt-5",
        cols[columns],
        className
      )}
      {...props}
    />
  );
}

export type StatProps = {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Colours the value for a result (win/loss streaks); otherwise ink. */
  tone?: "win" | "loss";
  /** "lg" is for the one headline figure on a page (the rating). */
  size?: "md" | "lg";
  className?: string;
};

/** Label over a tabular figure. Render inside <StatGroup>. */
export function Stat({ label, value, tone, size = "md", className }: StatProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-1 font-semibold tabular-nums tracking-tight",
          size === "lg" ? "text-3xl" : "text-xl",
          tone === "win" && "text-win",
          tone === "loss" && "text-loss",
          !tone && "text-foreground"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export type DeltaProps = React.ComponentProps<"span"> & {
  value: number;
};

/** Rating change: "+12" green, "−8" red, "0" quiet. Sign carries the meaning. */
export function Delta({ value, className, ...props }: DeltaProps) {
  const word = value > 0 ? "up" : value < 0 ? "down" : "no change";
  return (
    <span
      className={cn(
        "tabular-nums",
        value > 0 && "text-win",
        value < 0 && "text-loss",
        value === 0 && "text-muted-foreground",
        className
      )}
      aria-label={value === 0 ? word : `${word} ${Math.abs(value)}`}
      {...props}
    >
      {formatSigned(value)}
    </span>
  );
}

/** A single match result letter: W, L, or D for a draw (no colour). */
export function ResultMark({
  result,
  className,
}: {
  result: "W" | "L" | "D";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-semibold",
        result === "W" ? "text-win" : result === "L" ? "text-loss" : "text-muted-foreground",
        className
      )}
      aria-label={result === "W" ? "Win" : result === "L" ? "Loss" : "Draw"}
    >
      {result}
    </span>
  );
}
