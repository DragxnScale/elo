import Link from "next/link";
import { Container } from "@/components/ui/container";
import { ThemeToggle } from "@/components/ui/theme-toggle";

/**
 * Slim top bar for pages outside the app shell (player and profile): the
 * wordmark leads home and the theme toggle stays in reach on phones.
 */
export function PageBar() {
  return (
    <div className="border-b border-border">
      <Container as="nav" aria-label="Site" className="flex min-h-14 items-center justify-between">
        <Link
          href="/"
          className="-ml-2 rounded-md px-2 py-2 text-base font-semibold tracking-tight text-foreground"
        >
          BowlBoard
        </Link>
        <ThemeToggle className="-mr-2" />
      </Container>
    </div>
  );
}
