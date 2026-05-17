const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateShareCode(length = 6): string {
  let code = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) {
    code += CHARSET[bytes[i]! % CHARSET.length];
  }
  return code;
}

export function normalizeShareCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidShareCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code);
}
