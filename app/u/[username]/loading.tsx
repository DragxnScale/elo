import { PageSkeleton } from "@/components/stats/PageSkeleton";

export default function Loading() {
  return <PageSkeleton label="Loading profile" stats={7} />;
}
