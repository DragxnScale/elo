import { cn } from "@/lib/utils";

export type LiveStatus = "live" | "connecting" | "reconnecting";

const LABELS: Record<LiveStatus, string> = {
  live: "Live",
  connecting: "Connecting…",
  reconnecting: "Reconnecting…",
};

/**
 * Says whether the table is receiving live updates. The label is only "Live"
 * while the realtime channel is subscribed and the last reload worked;
 * "Connecting" is the short wait after opening a board, "Reconnecting" a
 * dropped channel. The dot never animates and is never green: it is state,
 * not decoration.
 */
export function LiveIndicator({
  status,
  className,
}: {
  status: LiveStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          status === "live" ? "bg-accent" : "bg-border-strong"
        )}
      />
      {LABELS[status]}
    </span>
  );
}
