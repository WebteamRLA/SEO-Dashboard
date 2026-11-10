import { APIError } from "better-auth/api";
import type { Role } from "@/lib/types/auth";
import { decideAccess, normalizeEmail } from "./access";

/** The few database calls the access hooks need. PrismaClient satisfies this. */
export interface AccessDb {
  accessInvite: {
    findUnique(args: { where: { email: string } }): Promise<{ role: string } | null>;
  };
  user: {
    findUnique(args: { where: { id: string } }): Promise<{
      id: string;
      email: string;
      emailVerified: boolean;
      role: string;
    } | null>;
    update(args: { where: { id: string }; data: { role: Role } }): Promise<unknown>;
  };
}

const DENIED_MESSAGES = {
  NOT_INVITED: "This Google account has not been invited.",
  EMAIL_NOT_VERIFIED: "This Google account's email is not verified.",
} as const;

/**
 * Throws when the account may not sign in. Better Auth turns a thrown APIError
 * into a redirect to the login page with `?error=<code>`.
 */
async function assertAccess(
  db: AccessDb,
  bootstrapAdmins: readonly string[],
  email: string,
  emailVerified: boolean,
): Promise<Role> {
  const invite = await db.accessInvite.findUnique({ where: { email: normalizeEmail(email) } });
  const decision = decideAccess({ email, emailVerified, bootstrapAdmins, inviteRole: invite?.role ?? null });
  if (!decision.allowed) {
    // Server log only, never shown to the visitor: lets an admin see who tried.
    console.warn(`Sign-in refused (${decision.reason}) for ${normalizeEmail(email)}`);
    throw new APIError("FORBIDDEN", { code: decision.reason, message: DENIED_MESSAGES[decision.reason] });
  }
  return decision.role;
}

/** Better Auth database hooks that make sign-in invite-only. */
export function createAccessHooks(db: AccessDb, bootstrapAdmins: readonly string[]) {
  return {
    user: {
      create: {
        // First sign-in: refuse anyone not invited, and set the invited role.
        before: async <U extends { email: string; emailVerified: boolean }>(user: U) => {
          const role = await assertAccess(db, bootstrapAdmins, user.email, user.emailVerified);
          return { data: { ...user, role } };
        },
      },
    },
    session: {
      create: {
        // Every later sign-in: re-check, so removing an invite locks the account
        // out at its next sign-in, and a role change takes effect.
        before: async (session: { userId: string }) => {
          const user = await db.user.findUnique({ where: { id: session.userId } });
          if (!user) {
            throw new APIError("FORBIDDEN", { code: "NOT_INVITED", message: DENIED_MESSAGES.NOT_INVITED });
          }
          const role = await assertAccess(db, bootstrapAdmins, user.email, user.emailVerified);
          if (role !== user.role) await db.user.update({ where: { id: user.id }, data: { role } });
        },
      },
    },
  };
}
