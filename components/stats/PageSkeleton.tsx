import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading shell shared by the player and profile routes. Every block matches
 * the height of what it stands in for so nothing shifts when content lands:
 * back link 40, title 32, meta 20, stat cell 52 (60 for the headline rating).
 */
export function PageSkeleton({
  label,
  headline = false,
  stats,
}: {
  /** Screen-reader status text. */
  label: string;
  /** The player page leads with a larger rating figure. */
  headline?: boolean;
  /** Number of stat cells. */
  stats: number;
}) {
  return (
    <Container as="main" aria-busy="true" className="space-y-10 py-8 sm:py-12">
      <p className="sr-only" role="status">
        {label}
      </p>
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex h-10 items-center">
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-56 max-w-full" />
          </div>
        </div>
        <div
          aria-hidden
          className="grid grid-cols-2 gap-x-6 gap-y-6 border-t border-border pt-5 sm:grid-cols-4"
        >
          {Array.from({ length: stats }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className={headline && i === 0 ? "h-9 w-20" : "h-7 w-20"} />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </Container>
  );
}
