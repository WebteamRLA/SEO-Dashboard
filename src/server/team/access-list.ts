/**
 * Builds the Team & Access list from who has signed in, who is invited, and
 * the admins set in AUTH_BOOTSTRAP_ADMINS. Pure, so it is unit-tested.
 */

import type { AccessMember } from "@/lib/types/auth";
import { isRole, normalizeEmail } from "@/server/auth/access";

export interface AccessUserRow {
  name: string;
  email: string;
  role: string;
}

export interface AccessInviteRow {
  email: string;
  role: string;
  createdAt: Date;
}

export function buildAccessList(
  users: readonly AccessUserRow[],
  invites: readonly AccessInviteRow[],
  bootstrapAdmins: readonly string[],
): AccessMember[] {
  const byEmail = new Map<string, AccessMember>();

  for (const invite of invites) {
    const email = normalizeEmail(invite.email);
    byEmail.set(email, {
      email,
      name: null,
      role: isRole(invite.role) ? invite.role : "member",
      status: "invited",
      bootstrap: false,
      invitedAt: invite.createdAt.toISOString(),
    });
  }

  // Someone who has signed in is active, whatever their invite says.
  for (const user of users) {
    const email = normalizeEmail(user.email);
    byEmail.set(email, {
      email,
      name: user.name.trim() || null,
      role: isRole(user.role) ? user.role : "member",
      status: "active",
      bootstrap: false,
      invitedAt: byEmail.get(email)?.invitedAt ?? null,
    });
  }

  // Admins from the environment: always admin, and not removable from the page.
  for (const raw of bootstrapAdmins) {
    const email = normalizeEmail(raw);
    const existing = byEmail.get(email);
    byEmail.set(
      email,
      existing
        ? { ...existing, role: "admin", bootstrap: true }
        : { email, name: null, role: "admin", status: "invited", bootstrap: true, invitedAt: null },
    );
  }

  return [...byEmail.values()];
}
