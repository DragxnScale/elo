/** Pure formatting helpers shared by the stats components. No React. */

function figure(value: number, digits: number): string {
  const text = value.toFixed(digits);
  // "-0" and "-0.0" are noise; show a plain zero.
  if (Number(text) === 0) return text.replace("-", "");
  return text.startsWith("-") ? `−${text.slice(1)}` : text;
}

/**
 * Score pair with an en dash: "21–17", "21.3–17.8". Negatives use a true
 * minus and spaces around the dash so it stays readable: "−3 – 10".
 */
export function formatScore(a: number, b: number, digits = 0): string {
  const left = figure(a, digits);
  const right = figure(b, digits);
  const spaced = left.startsWith("−") || right.startsWith("−");
  return spaced ? `${left} – ${right}` : `${left}–${right}`;
}

/** "Oct 24". UTC so the server output is deterministic and matches the heatmap. */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "Oct 2026". */
export function formatMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
