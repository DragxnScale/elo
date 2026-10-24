"use client";

import { useSyncExternalStore } from "react";
import ActivityTerrain from "@/components/kokonutui/activity-terrain";

const NARROW = "(max-width: 639px)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(NARROW);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

type ActivityCardProps = {
  /** Matches per day, oldest first (26 weeks from dailyActivity()). */
  data: number[];
  endDate: string;
  className?: string;
};

/**
 * Matches played as Kokonut's 3D height map. On phones it shows the last 13
 * weeks instead of 26, so each column is wide enough to read and to tap.
 */
export function ActivityCard({ data, endDate, className }: ActivityCardProps) {
  const narrow = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(NARROW).matches,
    () => false
  );
  const days = narrow ? 13 * 7 : data.length;

  return (
    <ActivityTerrain
      data={data.slice(-days)}
      endDate={endDate}
      title="Matches played"
      unit={["match", "matches"]}
      className={className}
    />
  );
}
