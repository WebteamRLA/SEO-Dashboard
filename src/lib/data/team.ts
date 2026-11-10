import "server-only";
import type { AccessMember } from "@/lib/types/auth";
import { getAuthConfig } from "@/server/auth/config";
import { requireSessionUser } from "@/server/auth/session";
import { createDb, releaseDb } from "@/server/db/client";
import { buildAccessList } from "@/server/team/access-list";

/**
 * Everyone who has signed in, for assigning leads. People who were invited but
 * have not signed in yet have no account to assign to.
 */
export async function getLeadPeople(): Promise<{ id: string; name: string }[]> {
  await requireSessionUser();
  const db = createDb();
  try {
    const users = await db.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { name: "asc" } });
    return users.map((user) => ({ id: user.id, name: user.name || user.email }));
  } finally {
    await releaseDb(db);
  }
}

/** Who can sign in: people who have, people invited, and bootstrap admins. */
export async function getAccessMembers(): Promise<AccessMember[]> {
  await requireSessionUser();
  const db = createDb();
  try {
    const [users, invites] = await Promise.all([
      db.user.findMany({ select: { name: true, email: true, role: true } }),
      db.accessInvite.findMany({ select: { email: true, role: true, createdAt: true } }),
    ]);
    return buildAccessList(users, invites, getAuthConfig()?.bootstrapAdmins ?? []);
  } finally {
    await releaseDb(db);
  }
}
