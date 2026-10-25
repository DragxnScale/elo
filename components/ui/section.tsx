import * as React from "react";
import { cn } from "@/lib/utils";

export type SectionProps = Omit<React.ComponentProps<"section">, "title"> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned control next to the title (a Button, a count). */
  action?: React.ReactNode;
  /** Heading element; h2 under a page title, h3 inside another section. */
  as?: "h2" | "h3";
};

/** Titled block of a page: sentence-case heading, optional lead line, content. */
export function Section({
  title,
  description,
  action,
  as: Heading = "h2",
  className,
  children,
  ...props
}: SectionProps) {
  const id = React.useId();
  return (
    <section
      aria-labelledby={id}
      className={cn("space-y-4", className)}
      {...props}
    >
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <Heading id={id} className="text-base font-semibold text-foreground">
            {title}
          </Heading>
          {description && (
            <p className="max-w-prose text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}
