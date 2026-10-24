import type * as React from "react";
import { cn } from "@/lib/utils";

export type EmptyStateProps = {
  title: React.ReactNode;
  /** Say what happens next, not just that nothing is here. */
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-sm flex-col items-center gap-1 py-12 text-center",
        className
      )}
    >
      <p className="text-base font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
