export function formatPointsLabel(points: number): string {
  const abs = Math.abs(points);
  const unit = `point${abs === 1 ? "" : "s"}`;
  if (points < 0) return `−${abs} ${unit}`;
  return `${points} ${unit}`;
}

export type MatchFieldErrors = {
  player1?: string;
  player2?: string;
  player1Points?: string;
  player2Points?: string;
};

export function validatePlayerSelect(
  value: string,
  label: string
): string | undefined {
  if (!value) {
    return `Please select ${label}.`;
  }
  return undefined;
}

export function validateRequiredText(value: string, label: string): string | undefined {
  if (value.trim() === "") {
    return `Please fill in ${label}.`;
  }
  return undefined;
}

export function validateIntegerText(value: string, label: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed === "") {
    return `Please fill in ${label}.`;
  }
  if (trimmed === "-" || trimmed === "+") {
    return `${label} must be a whole number.`;
  }
  if (!/^-?\d+$/.test(trimmed)) {
    return `${label} must be a whole number (negative values allowed).`;
  }
  return undefined;
}

export function parseIntegerText(value: string): number {
  return parseInt(value.trim(), 10);
}

/** Allow digits, optional leading minus, or empty while typing. */
export function sanitizeIntegerInput(value: string): string {
  if (value === "") return "";
  if (value === "-") return "-";
  const negative = value.startsWith("-");
  const digits = (negative ? value.slice(1) : value).replace(/\D/g, "");
  if (negative) return digits === "" ? "-" : `-${digits}`;
  return digits;
}
