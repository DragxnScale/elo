import type * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "destructive"
  | "link";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium " +
  "transition-[background-color,border-color,color,opacity,scale] duration-150 ease-out " +
  "motion-safe:active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress " +
  "[&_svg]:size-4 [&_svg]:shrink-0";

const variants: Record<ButtonVariant, string> = {
  // The ink itself: the one main action on a surface.
  primary: "bg-primary text-primary-foreground hover:bg-primary/85",
  // Outlined: secondary actions, cancel.
  secondary:
    "border border-input bg-card text-foreground hover:border-border-strong hover:bg-muted",
  // No chrome until hovered: toolbar and row actions.
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  // Quiet red text: the trigger that opens a destructive flow ("Delete board").
  danger: "text-loss hover:bg-loss-subtle",
  // Solid red: the confirm button inside a destructive dialog. Use once.
  destructive: "bg-loss text-background hover:bg-loss/85",
  // Inline text action.
  link: "h-auto rounded-sm px-0 text-foreground underline decoration-border-strong underline-offset-4 hover:decoration-foreground",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  // Thumb-sized: the primary action at the table, on a phone.
  lg: "h-12 px-6 text-base",
  icon: "size-10",
};

export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(base, variants[variant], variant !== "link" && sizes[size], className);
}

export type ButtonProps = React.ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Disables the button and sets aria-busy. Change the label yourself ("Saving…"). */
  loading?: boolean;
};

/** `type` defaults to "button"; pass type="submit" for form submit buttons. */
export function Button({
  variant,
  size,
  loading = false,
  className,
  type = "button",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  );
}
