/**
 * Maps known Supabase auth messages to plain copy. Matching is on lower-cased
 * substrings, so a wording change upstream degrades to the verbatim message
 * instead of breaking.
 */
export function friendlyAuthError(
  message: string,
  mode: "signin" | "signup",
): string {
  // The copy is the same in both modes today; the parameter keeps the call
  // site honest if the two flows ever need different wording.
  void mode;
  const text = message.toLowerCase();

  if (text.includes("invalid login credentials")) {
    return "That username and password don't match. Check them, or create an account.";
  }
  if (text.includes("user already registered")) {
    return "That username is taken. Pick another, or sign in if it's yours.";
  }
  if (
    text.includes("rate limit") ||
    text.includes("you can only request this after")
  ) {
    return "Too many attempts. Wait a minute, then try again.";
  }
  return message;
}
