/**
 * Maps a Fluent Forms webhook body to a website-form lead.
 *
 * Pure, so it is unit-tested. Fluent Forms sends either "All Data" (every field,
 * keyed by its name attribute) or "Selected Fields" (keys chosen in the webhook
 * settings), as JSON or as a form-encoded body. Each RLA form names its fields
 * differently, so fields are found by a list of likely names rather than one
 * fixed contract. Anything not recognised is kept, and shown under the message.
 */

import type { LeadSource } from "@/lib/types/leads";

/** A webhook body flattened to dotted, lower-cased keys: `names.first_name`. */
export type FlatFields = Record<string, string>;

export interface WebsiteFormLead {
  /** Fluent Forms' entry id, when the webhook sends one. Unique only within one WordPress site. */
  entryId: string | null;
  /** The answers that make this entry what it is. Hashed into the dedupe key. */
  identity: string;
  formName: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  message: string | null;
  heardFrom: string | null;
  services: string | null;
  budget: string | null;
  pageUrl: string | null;
  landingPage: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  channel: LeadSource;
}

/** The longest value kept for any one field. Protects the database and the UI. */
const MAX_FIELD_LENGTH = 5000;

/**
 * The parts of an entry that identify it: the same person sending the same
 * answers on the same form. Leaves out page and tracking fields, which can
 * differ when Fluent Forms resends an entry from its admin screen.
 */
export function identityOf(parts: {
  formName: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
}): string {
  return [parts.formName, parts.name, parts.email, parts.phone, parts.message]
    .map((part) => (part ?? "").trim().toLowerCase().replace(/\s+/g, " "))
    .join("\u001f");
}

/** Flattens nested objects and arrays into dotted keys. Keys are lower-cased. */
export function flattenFields(value: unknown, prefix = "", out: FlatFields = {}): FlatFields {
  if (value === null || value === undefined) return out;
  if (Array.isArray(value)) {
    const scalars = value.filter((item) => item === null || typeof item !== "object");
    if (scalars.length === value.length) {
      const joined = scalars
        .map((item) => String(item ?? "").replace(/\u0000/g, "").trim())
        .filter(Boolean)
        .join(", ")
        .slice(0, MAX_FIELD_LENGTH);
      if (prefix && joined) out[prefix] = joined;
      return out;
    }
    value.forEach((item, index) => flattenFields(item, prefix ? `${prefix}.${index}` : String(index), out));
    return out;
  }
  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const name = key.replace(/\u0000/g, "").trim().toLowerCase();
      flattenFields(child, prefix ? `${prefix}.${name}` : name, out);
    }
    return out;
  }
  const text = String(value).replace(/\u0000/g, "").trim();
  if (prefix && text) out[prefix] = text.slice(0, MAX_FIELD_LENGTH);
  return out;
}

const UNSAFE_KEYS = new Set(["__proto__", "prototype", "constructor"]);

/** Turns a form-encoded body into nested data: `names[first_name]=Ada` → `{ names: { first_name } }`. */
export function parseFormEncoded(body: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [rawKey, value] of new URLSearchParams(body)) {
    const path = rawKey.replace(/\]/g, "").split("[").filter((part, index) => index === 0 || part !== "");
    // Never walk into Object.prototype: `__proto__[x]=1` would pollute every object.
    if (path.some((part) => UNSAFE_KEYS.has(part))) continue;
    let node = result;
    path.forEach((part, index) => {
      if (index === path.length - 1) {
        const existing = node[part];
        node[part] = existing === undefined ? value : [existing, value].flat();
      } else {
        if (typeof node[part] !== "object" || node[part] === null) node[part] = {};
        node = node[part] as Record<string, unknown>;
      }
    });
  }
  return result;
}

/** Field names RLA forms are likely to use, best match first. `rla_` names come from the tracking snippet. */
const FIELDS = {
  entryId: ["entry_id", "submission_id", "_submission_id", "submission.id"],
  formName: ["form_title", "form_name", "rla_form_name"],
  fullName: ["name", "full_name", "your_name", "fullname", "contact_name", "names"],
  firstName: ["names.first_name", "first_name", "firstname", "fname"],
  lastName: ["names.last_name", "last_name", "lastname", "lname"],
  email: ["email", "email_address", "your_email", "e-mail", "work_email"],
  phone: ["phone", "phone_number", "telephone", "tel", "mobile", "phone_no", "contact_number"],
  company: ["company", "company_name", "business", "business_name", "organization", "organisation"],
  message: ["message", "your_message", "comments", "comment", "description", "project_details", "details", "enquiry", "inquiry"],
  heardFrom: ["heard_from", "how_did_you_hear_about_us", "hear_about_us", "how_did_you_find_us", "referral_source"],
  services: ["services", "service", "services_interested", "interested_in"],
  budget: ["budget", "project_budget", "monthly_budget"],
  pageUrl: ["rla_page_url", "page_url", "source_url", "embed_url"],
  landingPage: ["rla_landing_page", "landing_page"],
  referrer: ["rla_referrer", "referrer", "http_referer", "referer"],
  utmSource: ["rla_utm_source", "utm_source"],
  utmMedium: ["rla_utm_medium", "utm_medium"],
  utmCampaign: ["rla_utm_campaign", "utm_campaign"],
} as const;

/** Internal and anti-spam fields: never shown as an answer. */
const IGNORED_KEY = /^(_|__|ff_|g-recaptcha|h-captcha|cf-turnstile|wpnonce|_wp|nonce|token|rla_|gclid|fbclid)/;

/** The first of `keys` with a value. Records the key used, so other candidates still show as answers. */
function pick(fields: FlatFields, keys: readonly string[], used?: Set<string>): string | null {
  for (const key of keys) {
    const value = fields[key];
    if (value) {
      used?.add(key);
      return value;
    }
  }
  return null;
}

/** "your_message" → "Your message". */
function humanise(key: string): string {
  const text = key.replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** utm_source values AI assistants add to links, e.g. ChatGPT's `utm_source=chatgpt.com`. */
const AI_SOURCES = /(chatgpt|openai|perplexity|gemini|copilot|claude)/;
const SOCIAL_SOURCES = /(^|[^a-z])(facebook|fb|instagram|ig|linkedin|meta|tiktok|twitter|x|youtube|reddit|pinterest|threads)([^a-z]|$)/;
const PAID_MEDIUM = /^(cpc|ppc|paid|paidsearch|paid_search|paid-search|display|cpm|paid_social|paid-social|paidsocial|social_paid|social-paid|socialpaid)$/;
const AI_HOSTS = ["chatgpt.com", "chat.openai.com", "perplexity.ai", "gemini.google.com", "copilot.microsoft.com", "claude.ai", "you.com", "phind.com"];
/** Search result pages only. Other Google hosts (Gmail, Docs) are not search. */
const SEARCH_HOST = [
  /^google\.[a-z]{2,3}(\.[a-z]{2})?$/,
  /^com\.google\.android\.googlequicksearchbox$/,
  /^(cn\.)?bing\.com$/,
  /^duckduckgo\.com$/,
  /^search\.yahoo\.[a-z.]+$/,
  /^ecosia\.org$/,
  /^baidu\.com$/,
  /^yandex\.[a-z]{2,3}$/,
  /^search\.brave\.com$/,
  /^startpage\.com$/,
];
const MAIL_HOST = [/^mail\.google\.com$/, /^com\.google\.android\.gm$/, /^outlook\.(live|office|office365)\.com$/, /^mail\.yahoo\.com$/];
const SOCIAL_HOSTS = ["facebook.com", "fb.com", "instagram.com", "linkedin.com", "lnkd.in", "t.co", "twitter.com", "x.com", "youtube.com", "reddit.com", "tiktok.com", "pinterest.com", "threads.net"];

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function matches(host: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => host === pattern || host.endsWith(`.${pattern}`));
}

function matchesAny(host: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(host));
}

/**
 * Classifies the lead's channel from tracking data. The site's own pages are
 * not a source: a form posts from the page it is on, so an internal referrer
 * says nothing about how the visitor arrived. Without tracking data the answer
 * is "Unknown", never a guess.
 */
export function classifyChannel(input: {
  utmSource: string | null;
  utmMedium: string | null;
  referrer: string | null;
  siteHost: string;
}): LeadSource {
  const source = input.utmSource?.toLowerCase() ?? "";
  const medium = input.utmMedium?.toLowerCase() ?? "";
  const site = input.siteHost.toLowerCase().replace(/^www\./, "");
  const referrerHost = hostOf(input.referrer);
  const external = referrerHost && referrerHost !== site && !referrerHost.endsWith(`.${site}`) ? referrerHost : null;

  if (PAID_MEDIUM.test(medium)) {
    return medium.includes("social") || SOCIAL_SOURCES.test(source) ? "Social" : "Paid Search";
  }
  if (medium === "email" || source === "newsletter" || (external && matchesAny(external, MAIL_HOST))) return "Email";
  if (AI_SOURCES.test(source) || (external && matches(external, AI_HOSTS))) {
    return "AI Search";
  }
  if (medium === "social" || SOCIAL_SOURCES.test(source) || (external && matches(external, SOCIAL_HOSTS))) {
    return "Social";
  }
  if (medium === "organic" || (external && matchesAny(external, SEARCH_HOST))) return "Organic Search";
  if (medium === "referral" || external) return "Referral";
  if (source === "(direct)" || medium === "(none)" || source === "direct") return "Direct";
  return "Unknown";
}

/**
 * Builds the lead from a flattened webhook body. Returns null when the entry
 * has no way to contact the person, so empty or junk posts are not stored.
 */
export function toWebsiteFormLead(
  fields: FlatFields,
  context: { formName: string | null; siteHost: string },
): WebsiteFormLead | null {
  const used = new Set<string>();
  const get = (keys: readonly string[]) => pick(fields, keys, used);

  const first = get(FIELDS.firstName);
  const last = get(FIELDS.lastName);
  const joinedName = [first, last].filter(Boolean).join(" ") || null;
  const name = get(FIELDS.fullName) ?? joinedName;
  const email = get(FIELDS.email);
  const phone = get(FIELDS.phone);
  const ownMessage = get(FIELDS.message);
  if (!email && !phone && !name) return null;

  const company = get(FIELDS.company);
  const heardFrom = get(FIELDS.heardFrom);
  const services = get(FIELDS.services);
  const budget = get(FIELDS.budget);
  const formName = get(FIELDS.formName) ?? context.formName;
  const entryId = get(FIELDS.entryId);
  const utmSource = get(FIELDS.utmSource);
  const utmMedium = get(FIELDS.utmMedium);
  const utmCampaign = get(FIELDS.utmCampaign);
  const referrer = get(FIELDS.referrer);
  const pageUrl = get(FIELDS.pageUrl);
  const landingPage = get(FIELDS.landingPage);

  // Every answer not used above is shown under the message, so nothing is hidden.
  const otherAnswers = Object.entries(fields)
    .filter(([key]) => !used.has(key) && !IGNORED_KEY.test(key))
    .map(([key, value]) => `${humanise(key)}: ${value}`);
  const message = [ownMessage, otherAnswers.join("\n")].filter(Boolean).join("\n\n") || null;

  return {
    entryId,
    identity: identityOf({ formName, name, email, phone, message }),
    formName,
    name,
    email: email?.toLowerCase() ?? null,
    phone,
    company,
    message: message?.slice(0, MAX_FIELD_LENGTH) ?? null,
    heardFrom,
    services,
    budget,
    pageUrl,
    landingPage,
    referrer,
    utmSource,
    utmMedium,
    utmCampaign,
    channel: classifyChannel({ utmSource, utmMedium, referrer, siteHost: context.siteHost }),
  };
}
