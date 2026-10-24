import type * as React from "react";
import NextLink from "next/link";
import { cn } from "@/lib/utils";

const variants = {
  // Underlined: links inside running text and names that open a page.
  inline:
    "text-foreground underline decoration-border-strong hover:decoration-foreground",
  // Quiet: back links, secondary navigation. Underline on hover only.
  quiet: "text-muted-foreground hover:text-foreground hover:underline",
  // Names in a table or list: ink, underline on hover.
  plain: "text-foreground hover:underline",
} as const;

export type TextLinkProps = React.ComponentProps<typeof NextLink> & {
  variant?: keyof typeof variants;
};

export function TextLink({
  variant = "plain",
  className,
  ...props
}: TextLinkProps) {
  return (
    <NextLink
      className={cn(
        "rounded-sm underline-offset-4 transition-colors duration-150 ease-out",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
