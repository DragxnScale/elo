import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/ui/copy-button";
import { InviteButton } from "@/components/ui/invite-button";

/**
 * The 6-character share code: the one place monospace earns its keep (an
 * identifier you read aloud or retype), with copy and invite actions.
 * Entering the code (or opening the invite link) adds people to the board.
 */
export function ShareCode({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      <span className="select-all font-mono text-sm font-medium uppercase tracking-[0.18em] text-foreground">
        {code}
      </span>
      <CopyButton value={code} label="Copy code" />
      <InviteButton code={code} />
    </span>
  );
}
