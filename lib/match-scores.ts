/** Preset point totals for the match score dropdowns. */
export const SCORE_PRESETS = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 20, 21, 25, 30, 40, 50,
  75, 100, 150, 200, 250, 300, 400, 500,
] as const;

export const CUSTOM_SCORE = "custom";

export function formatPointsLabel(points: number): string {
  return `${points} point${points === 1 ? "" : "s"}`;
}

export function resolveScore(
  selected: string,
  customValue: string
): number | null {
  if (selected === CUSTOM_SCORE) {
    const n = Number(customValue);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.floor(n);
  }
  const n = Number(selected);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}
