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

/** Win-loss record with en dashes: "12–4", or "12–4–1" once there are draws. */
export function formatRecord(wins: number, losses: number, draws = 0): string {
  return draws > 0 ? `${wins}–${losses}–${draws}` : `${wins}–${losses}`;
}

const SUPERSCRIPT: Record<string, string> = {
  "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
  "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
};

/** Up to `digits` decimals, without trailing zeros: 84.30 -> "84.3". */
function trimFixed(value: number, digits: number): string {
  return value.toFixed(digits).replace(/\.?0+$/, "");
}

/**
 * A 0-1 share as a percentage, precise enough never to round a lopsided
 * share to "100%" or "0%": 0.843 -> "84.3%", 0.99999997 -> "99.9999968%",
 * 3.2e-8 -> "0.0000032%", 3.2e-248 -> "3.2 × 10⁻²⁴⁶%". An expected share
 * that is 1 in floating point (gaps over ~6,000 rating points) reads
 * "≈100%"; pass exact for shares that really are whole (a 21-0 shutout).
 */
export function formatShare(share: number, { exact = false } = {}): string {
  if (share <= 0) return "0%";
  if (share >= 1) return exact ? "100%" : "≈100%";
  const pct = share * 100;
  if (pct >= 1 && pct <= 99) return `${trimFixed(pct, 1)}%`;
  if (pct < 1) {
    if (pct < 1e-7) {
      const [mantissa, exponent] = pct.toExponential(1).split("e");
      const power = String(Number(exponent)).replace(/./g, (c) => SUPERSCRIPT[c] ?? c);
      return `${trimFixed(Number(mantissa), 1)} × 10${power}%`;
    }
    return `${trimFixed(pct, Math.ceil(-Math.log10(pct)) + 1)}%`;
  }
  // Above 99%: enough decimals to show how far from 100% it is.
  const rest = 100 - pct;
  const digits = Math.min(12, Math.ceil(-Math.log10(rest)) + 1);
  const shown = trimFixed(pct, digits);
  return shown === "100" ? "≈100%" : `${shown}%`;
}
