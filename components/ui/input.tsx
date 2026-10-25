import type * as React from "react";
import { cn } from "@/lib/utils";

export type ControlSize = "md" | "lg";

/** Shared by Input and Select. Errors are styled from aria-invalid. */
export function controlClasses(size: ControlSize = "md") {
  return cn(
    "block w-full rounded-md border border-input bg-card text-foreground outline-none",
    "placeholder:text-muted-foreground",
    "transition-[border-color,box-shadow] duration-150 ease-out",
    "hover:border-foreground/40 focus-visible:border-accent focus-visible:ring-[3px] focus-visible:ring-accent/20",
    "aria-invalid:border-loss aria-invalid:focus-visible:ring-loss/20",
    "disabled:cursor-not-allowed disabled:opacity-50",
    // 16px on phones stops iOS zooming into the field.
    size === "lg" ? "h-12 px-4 text-base" : "h-10 px-3 text-base sm:text-sm"
  );
}

export type InputProps = Omit<React.ComponentProps<"input">, "size"> & {
  size?: ControlSize;
  /** Sets aria-invalid, which also turns the border red. */
  invalid?: boolean;
};

export function Input({ size, invalid, className, ...props }: InputProps) {
  return (
    <input
      aria-invalid={invalid || props["aria-invalid"]}
      className={cn(controlClasses(size), className)}
      {...props}
    />
  );
}
