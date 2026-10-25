import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export const metadata = { title: "Page not found · BowlBoard" };

const TITLE = "We couldn't find that page";
const DESCRIPTION =
  "The link may be mistyped, or the board or player was removed.";

/**
 * Local build instead of EmptyState: its title is a <p>, and a 404 page needs
 * a real h1. Candidate: let EmptyState take a heading level.
 */
export default function NotFound() {
  return (
    <Container
      as="main"
      className="flex flex-1 items-center justify-center pt-16 pb-24"
    >
      <div className="flex max-w-sm flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold text-foreground">{TITLE}</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          {DESCRIPTION}
        </p>
        <Link
          href="/"
          className={buttonVariants({ variant: "primary", className: "mt-4" })}
        >
          Back to BowlBoard
        </Link>
      </div>
    </Container>
  );
}
