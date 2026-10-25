"use client";

import * as React from "react";
import { Check, Share2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

export type InviteButtonProps = Omit<ButtonProps, "onClick" | "children"> & {
  code: string;
};

/** The link that opens a board and joins it: /?code=ABC123. */
export function inviteUrl(code: string): string {
  return `${window.location.origin}/?code=${encodeURIComponent(code)}`;
}

/**
 * Shares an invite link: the phone's share sheet where there is one,
 * otherwise copies the link. Opening it signs people up to the board.
 */
export function InviteButton({
  code,
  variant = "ghost",
  size = "sm",
  ...props
}: InviteButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  React.useEffect(() => () => clearTimeout(timer.current), []);

  async function invite() {
    const url = inviteUrl(code);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Join my board on Kleos", url });
        return;
      } catch (error) {
        // Closing the share sheet is not an error; anything else falls back to copying.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked; the code itself is still on screen.
    }
  }

  return (
    <Button variant={variant} size={size} onClick={invite} {...props}>
      {copied ? <Check aria-hidden /> : <Share2 aria-hidden />}
      <span>{copied ? "Link copied" : "Invite"}</span>
      <span className="sr-only" aria-live="polite">
        {copied ? "Invite link copied to clipboard" : ""}
      </span>
    </Button>
  );
}
