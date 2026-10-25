import type * as React from "react";

/**
 * A polite live region that is always mounted, so assistive tech announces the
 * message when it appears (a role="status" node inserted with its text already
 * inside is often missed). It has no margin of its own and collapses to zero
 * height when empty: put any spacing on the message inside it, and render that
 * message with `role="none"` so the text is not announced twice.
 */
export function Live({ children }: { children?: React.ReactNode }) {
  return <div role="status">{children}</div>;
}
