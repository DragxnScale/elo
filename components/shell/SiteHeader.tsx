"use client";

import { AuthPanel } from "@/components/AuthPanel";
import { Container } from "@/components/ui/container";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type SiteHeaderProps = {
  username: string | null;
  /** False until the first session check finishes. */
  authReady: boolean;
  onAuthChange: () => void;
};

/** Wordmark, tagline and account controls. The Dot Field lives in the root layout. */
export function SiteHeader({
  username,
  authReady,
  onAuthChange,
}: SiteHeaderProps) {
  return (
    <div className="border-b border-border">
      <Container
        as="header"
        className="relative flex flex-col gap-4 py-6 sm:gap-5 sm:py-10 md:flex-row md:items-center md:justify-between"
      >
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            BowlBoard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground text-balance">
            Live ratings. Upsets rewarded. Fair losses cushioned.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <AuthPanel
            username={username}
            onAuthChange={onAuthChange}
            loading={!authReady}
          />
          <ThemeToggle className="ml-auto md:ml-0" />
        </div>
      </Container>
    </div>
  );
}
