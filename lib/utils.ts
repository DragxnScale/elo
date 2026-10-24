import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Signed number for rating changes: "+12", "−8" (true minus, U+2212), "0".
 * Always pair with colour, never rely on colour alone.
 */
export function formatSigned(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return `−${Math.abs(value)}`;
  return "0";
}

/** Win-loss record with an en dash: "12–4". */
export function formatRecord(wins: number, losses: number): string {
  return `${wins}–${losses}`;
}
