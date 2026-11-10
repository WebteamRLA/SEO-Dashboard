/**
 * Sends email through Resend's HTTP API. Plain fetch, no SDK, so it runs the
 * same on Vercel, Cloudflare Workers, and in tests (pass `fetchImpl`).
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const TIMEOUT_MS = 10_000;

/** The verified Resend domain. Override with RESEND_FROM. */
export const DEFAULT_FROM = "SEO Dashboard <invites@webmail.rightleftagency.com>";

export interface EmailConfig {
  apiKey: string;
  from: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export type SendResult = { ok: true; id: string } | { ok: false; error: string };

/** Email settings from the environment, or null when RESEND_API_KEY is missing. */
export function getEmailConfig(env: Record<string, string | undefined> = process.env): EmailConfig | null {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  return { apiKey, from: env.RESEND_FROM?.trim() || DEFAULT_FROM };
}

export async function sendEmail(
  message: EmailMessage,
  options: { config?: EmailConfig | null; fetchImpl?: typeof fetch } = {},
): Promise<SendResult> {
  const config = options.config === undefined ? getEmailConfig() : options.config;
  if (!config) return { ok: false, error: "email sending is not set up (RESEND_API_KEY is missing)" };
  const fetchImpl = options.fetchImpl ?? fetch;

  let response: Response;
  try {
    response = await fetchImpl(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: config.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const reason = error instanceof Error && error.name === "TimeoutError" ? "Resend did not answer in time" : "could not reach Resend";
    return { ok: false, error: reason };
  }

  const body: unknown = await response.json().catch(() => null);
  if (response.ok && isRecord(body) && typeof body.id === "string") return { ok: true, id: body.id };
  const detail = isRecord(body) && typeof body.message === "string" ? body.message : `HTTP ${response.status}`;
  return { ok: false, error: `Resend refused the email (${detail})` };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
