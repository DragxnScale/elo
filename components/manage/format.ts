/** Rating with thousands separators: 1012 -> "1,012". */
export function formatElo(value: number): string {
  return value.toLocaleString("en-US");
}

/** Match score with a true minus (U+2212) for negatives: -3 -> "−3". */
export function formatScore(value: number): string {
  const abs = Math.abs(value).toLocaleString("en-US");
  return value < 0 ? `−${abs}` : abs;
}
