import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { TextLink } from "@/components/ui/link";

/**
 * Quiet back link: chevron plus label, 40px tall, optically aligned to the
 * column edge. Candidate shared primitive.
 */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <TextLink
      variant="quiet"
      href={href}
      className="-ml-1 flex min-h-10 w-fit max-w-full items-center gap-1 break-words"
    >
      <ChevronLeft className="size-4 shrink-0" aria-hidden />
      {children}
    </TextLink>
  );
}
