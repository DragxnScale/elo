const AUTH_DOMAIN = "elo.local";

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${AUTH_DOMAIN}`;
}

export function normalizeUsername(input: string): string {
  const trimmed = input.trim().toLowerCase();
  const local = trimmed.includes("@") ? trimmed.split("@")[0]! : trimmed;
  return local.replace(/[^a-z0-9_]/g, "");
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9_]{3,20}$/.test(username);
}
