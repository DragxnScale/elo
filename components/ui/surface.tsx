import type * as React from "react";
import { cn } from "@/lib/utils";

const padding = {
  none: "",
  sm: "p-3",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-6",
} as const;

export type SurfaceProps = React.ComponentProps<"div"> & {
  padding?: keyof typeof padding;
};

/**
 * A hairline-bordered container. Use sparingly: for a form the user is filling
 * in, a preview they must confirm, a list that needs an edge. Never to wrap
 * every section, and never nest one inside another. Whitespace and rules
 * (border-t) are the default way to group.
 */
export function Surface({ padding: pad = "md", className, ...props }: SurfaceProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card",
        padding[pad],
        className
      )}
      {...props}
    />
  );
}
