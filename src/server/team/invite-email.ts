/** The team invite email. Pure, so it is unit-tested. */

import { ROLE_LABELS, type Role } from "@/lib/types/auth";
import { escapeHtml } from "@/server/email/escape";
import type { EmailMessage } from "@/server/email/resend";

export function buildInviteEmail(input: {
  to: string;
  role: Role;
  inviterName: string;
  /** Absolute URL of the login page. */
  signInUrl: string;
}): EmailMessage {
  const role = ROLE_LABELS[input.role];
  const inviter = input.inviterName.trim() || "A teammate";
  const subject = `${inviter} invited you to the RLA SEO Dashboard`;

  const text = [
    `${inviter} gave you ${role} access to the RLA SEO Dashboard.`,
    "",
    `Sign in with the Google account for ${input.to}:`,
    input.signInUrl,
    "",
    "If you did not expect this, you can ignore this email.",
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f6f6f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f1f1f;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e5e5e2;border-radius:8px;">
      <tr>
        <td style="padding:28px;">
          <p style="margin:0 0 4px;font-size:13px;color:#6b6b6b;">RLA SEO Dashboard</p>
          <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;">You're invited</h1>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">
            ${escapeHtml(inviter)} gave you <strong>${escapeHtml(role)}</strong> access to the RLA SEO Dashboard.
          </p>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.5;">
            Sign in with the Google account for <strong>${escapeHtml(input.to)}</strong>.
          </p>
          <a href="${escapeHtml(input.signInUrl)}" style="display:inline-block;padding:10px 18px;background:#1f4fa3;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">Sign in with Google</a>
          <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#6b6b6b;">
            If you did not expect this, you can ignore this email.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { to: input.to, subject, html, text };
}
