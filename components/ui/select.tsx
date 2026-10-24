import type * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { controlClasses, type ControlSize } from "@/components/ui/input";

export type SelectProps = Omit<React.ComponentProps<"select">, "size"> & {
  size?: ControlSize;
  invalid?: boolean;
  /** Classes for the wrapper (width, flex). */
  className?: string;
};

/** Native <select> (best picker on phones) with the Scorecard chevron. */
export function Select({
  size,
  invalid,
  className,
  children,
  ...props
}: SelectProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <select
        aria-invalid={invalid || props["aria-invalid"]}
        className={cn(controlClasses(size), "cursor-pointer appearance-none pr-9")}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}
