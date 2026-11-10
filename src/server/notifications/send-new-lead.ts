import "server-only";
import { notificationPreferences as CATALOG } from "@/mocks/operations";
import { createDb, releaseDb } from "@/server/db/client";
import { getEmailConfig, sendEmail } from "@/server/email/resend";
import { buildNewLeadEmail } from "./new-lead-email";
import { NEW_LEAD_EVENT, wants } from "./preferences";
import { describeError } from "@/server/log";

/**
 * Emails everyone with dashboard access who wants new-lead emails (on by
 * default). Runs after the webhook has answered, so a slow or failing email
 * never loses a lead. Logs counts only: no lead details in logs.
 *
 * A flood of form submissions (spam, or a bot) would otherwise mean a flood of
 * email to everyone, so past MAX_PER_HOUR new website leads in an hour the rest
 * are not emailed. They still arrive in the Lead Inbox and the bell.
 */
export const MAX_PER_HOUR = 20;

export async function notifyNewLead(leadId: string): Promise<void> {
  const config = getEmailConfig();
  const baseUrl = process.env.BETTER_AUTH_URL?.trim().replace(/\/$/, "");
  if (!config || !baseUrl) {
    console.warn("New-lead email skipped: RESEND_API_KEY or BETTER_AUTH_URL is not set.");
    return;
  }

  const db = createDb();
  try {
    const [lead, users] = await Promise.all([
      db.lead.findUnique({ where: { id: leadId }, select: { id: true, name: true, company: true, email: true, formName: true, channel: true } }),
      db.user.findMany({
        select: { email: true, notificationPreferences: { where: { eventId: NEW_LEAD_EVENT }, select: { eventId: true, email: true, inApp: true } } },
      }),
    ]);
    if (!lead) return;

    const lastHour = await db.lead.count({
      where: { origin: "website-form", createdAt: { gte: new Date(Date.now() - 60 * 60_000) } },
    });
    if (lastHour > MAX_PER_HOUR) {
      console.warn(`New-lead email skipped: ${lastHour} website leads in the last hour (limit ${MAX_PER_HOUR}).`);
      return;
    }

    const recipients = users.filter((user) => wants(CATALOG, user.notificationPreferences, NEW_LEAD_EVENT, "email"));
    const results = await Promise.all(
      recipients.map((user) =>
        sendEmail(
          buildNewLeadEmail({
            to: user.email,
            leadName: lead.name ?? lead.company ?? lead.email ?? "Someone",
            formName: lead.formName,
            source: lead.channel,
            leadUrl: `${baseUrl}/leads/${encodeURIComponent(lead.id)}`,
          }),
          { config },
        ),
      ),
    );
    const failed = results.filter((result) => !result.ok);
    if (failed.length > 0) {
      console.warn(`New-lead email: ${failed.length} of ${results.length} not sent`, failed[0] && !failed[0].ok ? failed[0].error : "");
    }
  } catch (error) {
    console.error("New-lead email failed:", describeError(error));
  } finally {
    await releaseDb(db);
  }
}
