import { createDb, releaseDb } from "@/server/db/client";
import { flattenFields, parseFormEncoded, toWebsiteFormLead } from "@/server/leads/fluent-forms";

/**
 * Receives Fluent Forms submissions from the RLA website (Fluent Forms Pro >
 * form > Settings & Integrations > Webhook). Public, so it is guarded by a
 * shared secret sent in the `X-Webhook-Secret` header. Each entry is stored
 * once: a repeated webhook updates the same lead and never touches its stage
 * or anything the team has edited.
 *
 * Optional `?form=Contact%20Form` on the webhook URL names the form when the
 * body does not include its title.
 */

const NO_STORE = { "cache-control": "no-store" };
/** Form posts are small. Anything larger is not a genuine submission. */
const MAX_BODY_BYTES = 100_000;
const DEFAULT_SITE_HOST = "rightleftagency.com";

function reply(status: number, body: Record<string, string>) {
  return Response.json(body, { status, headers: NO_STORE });
}

async function sha256(text: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

/** Compares digests in constant time, so the response time does not leak the secret. */
async function secretMatches(given: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([sha256(given), sha256(expected)]);
  let difference = 0;
  for (let index = 0; index < a.length; index++) difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  return difference === 0;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Reads the body, stopping once it passes `limit` bytes. Null when it is too large. */
async function readLimited(request: Request, limit: number): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";
}

function parseBody(raw: string, contentType: string): unknown {
  if (contentType.includes("application/json")) return JSON.parse(raw);
  if (contentType.includes("application/x-www-form-urlencoded")) return parseFormEncoded(raw);
  // Unlabelled: try JSON, then form encoding.
  try {
    return JSON.parse(raw);
  } catch {
    return parseFormEncoded(raw);
  }
}

export async function POST(request: Request) {
  const expected = process.env.FLUENT_FORMS_WEBHOOK_SECRET?.trim();
  if (!expected) {
    console.error("Fluent Forms webhook rejected: FLUENT_FORMS_WEBHOOK_SECRET is not set");
    return reply(503, { status: "not-configured" });
  }
  const given = request.headers.get("x-webhook-secret")?.trim() ?? "";
  if (!given || !(await secretMatches(given, expected))) {
    return reply(401, { status: "unauthorized" });
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) return reply(413, { status: "too-large" });
  const raw = await readLimited(request, MAX_BODY_BYTES);
  if (raw === null) return reply(413, { status: "too-large" });

  let body: unknown;
  try {
    body = parseBody(raw, request.headers.get("content-type") ?? "");
  } catch {
    return reply(400, { status: "invalid-body" });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return reply(400, { status: "invalid-body" });
  }

  const fields = flattenFields(body);
  const formParam = new URL(request.url).searchParams.get("form")?.trim().slice(0, 200) || null;
  const lead = toWebsiteFormLead(fields, {
    formName: formParam,
    siteHost: process.env.LEADS_SITE_HOST?.trim() || DEFAULT_SITE_HOST,
  });
  if (!lead) return reply(422, { status: "no-contact-details" });

  // The entry id is unique only within one WordPress site, so it is paired with
  // the entry's answers: a staging copy's entry 123 cannot overwrite the live
  // site's entry 123. Without an id, the same answers count as the same entry.
  const identityHash = toHex(await sha256(lead.identity));
  const entryKey = lead.entryId
    ? `fluentforms:${lead.entryId}:${identityHash.slice(0, 16)}`
    : `fluentforms:content:${identityHash}`;

  const formOwned = {
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    message: lead.message,
    heardFrom: lead.heardFrom,
    services: lead.services,
    budget: lead.budget,
    channel: lead.channel,
    formName: lead.formName,
    pageUrl: lead.pageUrl,
    landingPage: lead.landingPage,
    referrer: lead.referrer,
    utmSource: lead.utmSource,
    utmMedium: lead.utmMedium,
    utmCampaign: lead.utmCampaign,
    formPayload: fields,
  };

  const db = createDb();
  try {
    const saved = await db.lead.upsert({
      where: { formEntryKey: entryKey },
      create: {
        id: crypto.randomUUID(),
        origin: "website-form",
        submittedAt: new Date(),
        stage: "new",
        formEntryKey: entryKey,
        ...formOwned,
      },
      // A resend refreshes the form's answers only; stage, deal, and notes stay as the team left them.
      update: formOwned,
      select: { id: true },
    });
    return reply(200, { status: "ok", id: saved.id });
  } catch (error) {
    // Two copies of one webhook at once: the other request stored it.
    if (isUniqueViolation(error)) return reply(200, { status: "ok" });
    // No request body in the log: it holds personal details.
    console.error("Fluent Forms webhook failed to store a lead", error instanceof Error ? error.message : error);
    return reply(500, { status: "error" });
  } finally {
    await releaseDb(db);
  }
}
