import { PageSkeleton } from "@/components/stats/PageSkeleton";

export default function Loading() {
  return <PageSkeleton label="Loading player" headline stats={8} />;
}
