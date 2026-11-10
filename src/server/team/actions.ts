"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { ROLES, type Role, type SessionUser } from "@/lib/types/auth";
import { normalizeEmail } from "@/server/auth/access";
import { getAuthConfig } from "@/server/auth/config";
import { getSessionUser } from "@/server/auth/session";
import { createDb, releaseDb } from "@/server/db/client";
import { sendEmail } from "@/server/email/resend";
import { buildInviteEmail } from "./invite-email";

/** What the page shows after an action: a toast in the matching tone. */
export interface TeamActionResult {
  status: "success" | "warning" | "error";
  message: string;
}

const emailInput = z.string().trim().toLowerCase().pipe(z.email());

const inviteInput = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  role: z.enum(ROLES),
});

/** Invites someone by email: saves the invite (which lets them sign in) and emails them. */
export async function inviteMember(input: { email: string; role: Role }): Promise<TeamActionResult> {
  const admin = await requireAdmin();
  if (!admin) return error("Only admins can invite people.");
  const config = getAuthConfig();
  if (!config) return error("Sign-in is not set up on this deployment, so nobody can be invited yet.");

  const parsed = inviteInput.safeParse(input);
  if (!parsed.success) return error("Enter an email address, such as name@example.com, and choose a role.");
  const { email, role } = parsed.data;

  if (config.bootstrapAdmins.includes(email)) return error(`${email} is already an admin.`);

  const db = createDb();
  try {
    const user = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
    if (user) return error(`${email} already has access.`);
    const existing = await db.accessInvite.findUnique({ where: { email } });
    if (existing) return error(`${email} is already invited. Use Resend invite to send the email again.`);
    await db.accessInvite.create({ data: { email, role } });
  } finally {
    await releaseDb(db);
  }

  refresh();
  return sendInvite(admin, email, role, config.baseURL, "invited");
}

/** Sends the invite email again, for someone who is invited but has not signed in. */
export async function resendInvite(rawEmail: string): Promise<TeamActionResult> {
  const admin = await requireAdmin();
  if (!admin) return error("Only admins can send invites.");
  const config = getAuthConfig();
  if (!config) return error("Sign-in is not set up on this deployment.");
  const parsed = emailInput.safeParse(rawEmail);
  if (!parsed.success) return error("Enter a valid email address.");
  const email = normalizeEmail(parsed.data);

  const db = createDb();
  let role: Role;
  try {
    const invite = await db.accessInvite.findUnique({ where: { email } });
    if (!invite) return error(`${email} is not invited.`);
    const user = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
    if (user) return error(`${email} has already signed in.`);
    role = (ROLES as readonly string[]).includes(invite.role) ? (invite.role as Role) : "member";
  } finally {
    await releaseDb(db);
  }

  return sendInvite(admin, email, role, config.baseURL, "resent");
}

/** Removes someone's access: deletes the invite and their account, which ends their sessions now. */
export async function removeMember(rawEmail: string): Promise<TeamActionResult> {
  const admin = await requireAdmin();
  if (!admin) return error("Only admins can remove people.");
  const parsed = emailInput.safeParse(rawEmail);
  if (!parsed.success) return error("Enter a valid email address.");
  const email = normalizeEmail(parsed.data);
  if (email === normalizeEmail(admin.email)) return error("You cannot remove yourself.");
  if (getAuthConfig()?.bootstrapAdmins.includes(email)) {
    return error(`${email} is an admin set in AUTH_BOOTSTRAP_ADMINS. Remove them there instead.`);
  }

  const db = createDb();
  try {
    // Sessions and Google links cascade with the user row.
    await db.$transaction([
      db.accessInvite.deleteMany({ where: { email } }),
      db.user.deleteMany({ where: { email: { equals: email, mode: "insensitive" } } }),
    ]);
  } finally {
    await releaseDb(db);
  }

  refresh();
  return { status: "success", message: `${email} no longer has access.` };
}

async function sendInvite(
  admin: SessionUser,
  email: string,
  role: Role,
  baseURL: string,
  verb: "invited" | "resent",
): Promise<TeamActionResult> {
  const message = buildInviteEmail({ to: email, role, inviterName: admin.name, signInUrl: `${baseURL}/login` });
  const sent = await sendEmail(message);
  if (!sent.ok) {
    console.error(`Invite email to ${email} failed: ${sent.error}`);
    return {
      status: "warning",
      message: `${email} can sign in, but the invite email did not send: ${sent.error}. Try Resend invite.`,
    };
  }
  return {
    status: "success",
    message: verb === "invited" ? `Invite sent to ${email}.` : `Invite sent to ${email} again.`,
  };
}

async function requireAdmin(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  return user?.role === "admin" ? user : null;
}

function error(message: string): TeamActionResult {
  return { status: "error", message };
}
