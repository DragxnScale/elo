export function formatPointsLabel(points: number): string {
  return `${points} point${points === 1 ? "" : "s"}`;
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
  if (!/^\d+$/.test(trimmed)) {
    return `${label} must be a whole number (no decimals or letters).`;
  }
  return undefined;
}

export function parseIntegerText(value: string): number {
  return parseInt(value.trim(), 10);
}

/** Allow only digits or empty while typing. */
export function sanitizeIntegerInput(value: string): string {
  if (value === "") return "";
  return value.replace(/\D/g, "");
}
