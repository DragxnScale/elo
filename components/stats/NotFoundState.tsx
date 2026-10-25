import type { ReactNode } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

/**
 * Segment not-found page. Local build instead of EmptyState because its title
 * is a <p> and a not-found page needs a real h1 (same reason as app/not-found).
 */
export function NotFoundState({
  title,
  description,
}: {
  title: ReactNode;
  description: ReactNode;
}) {
  return (
    <Container as="main" className="flex flex-1 items-center justify-center py-8">
      <div className="flex max-w-sm flex-col items-center gap-2 text-center">
        <h1 className="text-balance text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-pretty text-sm text-muted-foreground">{description}</p>
        <Link href="/" className={buttonVariants({ variant: "secondary", className: "mt-4" })}>
          Back to Kleos
        </Link>
      </div>
    </Container>
  );
}
