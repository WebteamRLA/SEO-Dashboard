import { escapeHtml } from "@/server/email/escape";
import type { EmailMessage } from "@/server/email/resend";

/**
 * The "new lead received" email. Pure, so it is unit-tested. Everything about
 * the lead comes from a public form: it is escaped in HTML, kept out of the
 * subject except the form's name, and line breaks are removed.
 */
export function buildNewLeadEmail(input: {
  to: string;
  leadName: string;
  formName: string | null;
  source: string;
  /** Absolute URL of the lead in the dashboard. */
  leadUrl: string;
}): EmailMessage {
  const name = oneLine(input.leadName).slice(0, 120) || "Someone";
  const form = input.formName ? oneLine(input.formName).slice(0, 120) : null;
  // The subject names the form only: the person's name is free text from a public form,
  // and an inbox subject from our own domain is where a phishing line would land.
  const subject = form ? `New website lead (${form})` : "New website lead";
  const where = form ? `through ${form}` : "through the website";

  const text = [
    `${name} sent an enquiry ${where}.`,
    `Source: ${input.source}`,
    "",
    "Open the lead in the SEO Dashboard:",
    input.leadUrl,
    "",
    "You get this because new-lead emails are on in your notification settings.",
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f6f6f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f1f1f;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e5e5e2;border-radius:8px;">
      <tr>
        <td style="padding:28px;">
          <p style="margin:0 0 4px;font-size:13px;color:#6b6b6b;">RLA SEO Dashboard</p>
          <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;">New lead</h1>
          <p style="margin:0 0 8px;font-size:14px;line-height:1.5;">
            <strong>${escapeHtml(name)}</strong> sent an enquiry ${escapeHtml(where)}.
          </p>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.5;color:#6b6b6b;">Source: ${escapeHtml(input.source)}</p>
          <a href="${escapeHtml(input.leadUrl)}" style="display:inline-block;padding:10px 18px;background:#1f4fa3;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">Open the lead</a>
          <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#6b6b6b;">
            You get this because new-lead emails are on in your notification settings.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { to: input.to, subject, html, text };
}

function oneLine(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ").trim();
}
