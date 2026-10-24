"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

export type CopyButtonProps = Omit<ButtonProps, "onClick" | "children"> & {
  value: string;
  label?: string;
};

/** Copies `value`; the label reads "Copied" for a moment. Announced politely. */
export function CopyButton({
  value,
  label = "Copy",
  variant = "ghost",
  size = "sm",
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  React.useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be blocked (insecure context, permissions). Stay quiet:
      // the code is on screen and selectable.
    }
  }

  return (
    <Button variant={variant} size={size} onClick={copy} {...props}>
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      <span>{copied ? "Copied" : label}</span>
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </Button>
  );
}
