import * as React from "react";
import { cn } from "@/lib/utils";

const sizes = {
  // Forms and dialogs-in-page.
  narrow: "max-w-xl",
  // The app column: header, tabs, leaderboard, stats. Everything aligns here.
  default: "max-w-3xl",
  // Reserved; avoid. Wider lines hurt scanning a 5-column table.
  wide: "max-w-5xl",
} as const;

export type ContainerProps = React.ComponentProps<"div"> & {
  size?: keyof typeof sizes;
  as?: "div" | "main" | "header" | "section" | "nav" | "footer";
};

/** The single page column: centred, 16px gutters on phones, 24px from sm. */
export function Container({
  size = "default",
  as: Tag = "div",
  className,
  ...props
}: ContainerProps) {
  return (
    <Tag
      className={cn("mx-auto w-full px-4 sm:px-6", sizes[size], className)}
      {...props}
    />
  );
}
