/**
 * Who may sign in. Pure, so the rules are unit-tested without a database.
 * Sign-in is invite-only: a Google account needs a verified email that is either
 * a bootstrap admin (from the environment) or has an invite.
 */

import { ROLES, type Role } from "@/lib/types/auth";

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Emails compare case-insensitively and without surrounding spaces. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Parses a comma- or whitespace-separated list, such as AUTH_BOOTSTRAP_ADMINS. */
export function parseEmailList(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[\s,]+/)
    .map(normalizeEmail)
    .filter((email) => email.includes("@"));
}

export type AccessDecision =
  | { allowed: true; role: Role }
  | { allowed: false; reason: "EMAIL_NOT_VERIFIED" | "NOT_INVITED" };

export function decideAccess(input: {
  email: string;
  emailVerified: boolean;
  bootstrapAdmins: readonly string[];
  /** The invite's role for this email, or null when there is no invite. */
  inviteRole: string | null;
}): AccessDecision {
  // An unverified address could belong to anyone, so it never matches an invite.
  if (!input.emailVerified) return { allowed: false, reason: "EMAIL_NOT_VERIFIED" };
  if (input.bootstrapAdmins.includes(normalizeEmail(input.email))) return { allowed: true, role: "admin" };
  if (input.inviteRole === null) return { allowed: false, reason: "NOT_INVITED" };
  // An unrecognised role in the database gets the least privilege, not an error.
  return { allowed: true, role: isRole(input.inviteRole) ? input.inviteRole : "member" };
}
