/**
 * Messages for the `?error=` codes Better Auth adds when it sends someone back to
 * the login page. Only known codes get specific text, and the raw parameter is
 * never shown.
 */
const MESSAGES: Record<string, string> = {
  NOT_INVITED: "This Google account doesn't have access yet. Ask a dashboard admin to invite you.",
  EMAIL_NOT_VERIFIED: "Google hasn't verified this account's email address, so it can't be used to sign in.",
  access_denied: "Sign-in was cancelled.",
};

const FALLBACK = "Sign-in didn't complete. Please try again.";

export function signInErrorMessage(code: string | string[] | undefined): string | null {
  const value = Array.isArray(code) ? code[0] : code;
  if (!value) return null;
  return MESSAGES[value] ?? FALLBACK;
}
