import type {
  Lead,
  LeadActivity,
  LeadNote,
  LeadSource,
  MonthKey,
  PipelineStage,
} from "@/lib/types";
import { ACTIVE_MONTHS, REFERENCE_DATE } from "./calendar";
import { createRandom, pad } from "./seed";

const FIRST_NAMES = ["Alicia", "Marcus", "Hannah", "Victor", "Sofia", "Andre", "Grace", "Liam", "Nadia", "Owen", "Rosa", "Felix", "Tessa", "Jonah", "Mira", "Caleb", "Ines", "Theo", "Leah", "Ravi"] as const;
const LAST_NAMES = ["Bennett", "Castillo", "Dawson", "Ellison", "Fontaine", "Garner", "Hale", "Ibarra", "Jensen", "Kowalski", "Lindgren", "Mercer", "Novak", "Osei", "Pruitt", "Quinn", "Rowan", "Sandoval", "Tanaka", "Vance"] as const;
const COMPANY_PREFIXES = ["Harborline", "Cedar Ridge", "Northgate", "Bluepeak", "Stonebrook", "Larkspur", "Ironwood", "Silver Oak", "Redfern", "Clearwater"] as const;
const COMPANY_SUFFIXES = ["Dental Group", "Roofing", "Legal Partners", "Home Services", "Fitness", "Veterinary Clinic", "Financial Advisors", "Interiors", "Auto Care", "Landscaping"] as const;

const FORMS = [
  { name: "Contact Form", page: "/contact" },
  { name: "Free SEO Audit", page: "/free-seo-audit" },
  { name: "Request a Quote", page: "/get-a-quote" },
  { name: "Service Inquiry", page: "/services/seo" },
  { name: "Service Inquiry", page: "/services/web-design" },
] as const;

const LANDING_PAGES = ["/services/seo", "/services/web-design", "/services/paid-media", "/blog/local-seo-checklist", "/blog/how-much-does-seo-cost", "/"] as const;

const MESSAGES = [
  "We have been losing rankings over the last few months and would like an audit of what is going wrong.",
  "Looking for a partner to manage our SEO on an ongoing basis. Could you share pricing and how you typically work?",
  "We are redesigning our site this quarter and want to protect our organic traffic during the move.",
  "Our competitors keep outranking us for local searches. Can you help us show up in the map results?",
  "I would like a quote for monthly content and link building. We have a small in-house marketing team.",
  "We just opened a second location and need help getting both found on Google.",
  "Your blog post on SEO costs was helpful. Can we set up a short call to talk through our budget?",
  "Our website gets traffic but very few enquiries. Do you offer conversion optimization alongside SEO?",
] as const;

const SPAM_MESSAGES = [
  "Hello, I can offer high DA guest posts and backlinks at a very low price. Reply for our site list.",
  "We noticed your site has errors. Our team can get you on the first page of Google in 7 days, guaranteed.",
  "Buy 500 dofollow backlinks today. Limited offer for website owners.",
  "Greetings, I am a virtual assistant for hire. Cheap rates for data entry and lead generation.",
] as const;

const NOTE_BODIES = [
  "Left a voicemail and sent a follow-up email.",
  "Budget confirmed. Wants a proposal by the end of next week.",
  "Currently under contract with another agency until next quarter.",
  "Decision maker joining the next call.",
] as const;

const SOURCES: readonly { source: LeadSource; medium: string; weight: number }[] = [
  { source: "Organic Search", medium: "organic", weight: 0.5 },
  { source: "Direct", medium: "none", weight: 0.14 },
  { source: "Referral", medium: "referral", weight: 0.14 },
  { source: "Paid Search", medium: "cpc", weight: 0.1 },
  { source: "Social", medium: "social", weight: 0.07 },
  { source: "Email", medium: "email", weight: 0.05 },
];

const REFERRERS: Partial<Record<LeadSource, readonly string[]>> = {
  "Organic Search": ["google.com", "bing.com"],
  Referral: ["clutch.example", "partner-directory.example"],
  Social: ["linkedin.com", "facebook.com"],
  "Paid Search": ["google.com"],
};

const CAMPAIGNS: Partial<Record<LeadSource, readonly string[]>> = {
  "Paid Search": ["seo-services-q3", "brand-search"],
  Email: ["monthly-newsletter"],
  Social: ["case-study-promo"],
};

/** Leads per month. Rises through the year as the SEO work compounds. */
const MONTHLY_VOLUME: Record<MonthKey, number> = {
  "2026-01": 8, "2026-02": 9, "2026-03": 11, "2026-04": 10, "2026-05": 13, "2026-06": 14,
  "2026-07": 15, "2026-08": 14, "2026-09": 17, "2026-10": 19, "2026-11": 4,
};

/** Older leads have travelled further through the pipeline. */
const MATURE_STAGES: readonly (readonly [PipelineStage, number])[] = [
  ["won", 0.26], ["lost", 0.26], ["proposal", 0.12], ["meeting", 0.1], ["contacted", 0.16], ["new", 0.1],
];
const RECENT_STAGES: readonly (readonly [PipelineStage, number])[] = [
  ["new", 0.28], ["contacted", 0.22], ["meeting", 0.14], ["proposal", 0.12], ["won", 0.17], ["lost", 0.07],
];

const STAGE_PATH: readonly PipelineStage[] = ["new", "contacted", "meeting", "proposal"];
const STAGE_LABEL: Record<PipelineStage, string> = {
  new: "New", contacted: "Contacted", meeting: "Meeting", proposal: "Proposal", won: "Won", lost: "Lost", spam: "Spam",
};

const random = createRandom(20261106);

function weighted<T>(entries: readonly (readonly [T, number])[]): T {
  let roll = random.next();
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return (entries[entries.length - 1] as readonly [T, number])[0];
}

const DAY_MS = 86_400_000;
const LATEST_EVENT = Date.parse(`${REFERENCE_DATE}T09:00:00.000Z`);

function addDays(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * DAY_MS).toISOString();
}

/** Days between events, shortened so a recent lead's history ends by "today". */
function stepGap(submittedAt: string, steps: number): number {
  const available = (LATEST_EVENT - Date.parse(submittedAt)) / DAY_MS;
  return Math.max(0, Math.min(3, available / (steps + 1)));
}

function buildActivity(id: string, stage: PipelineStage, submittedAt: string, assigneeId: string | null): LeadActivity[] {
  const log: LeadActivity[] = [
    { id: `${id}-a0`, type: "created", description: "Lead created from website form", actorId: null, createdAt: submittedAt },
  ];

  if (stage === "spam") {
    log.unshift({ id: `${id}-a1`, type: "stage-changed", description: "Moved to Spam by the AI filter", actorId: null, createdAt: addDays(submittedAt, 0) });
    return log;
  }

  const reached = stage === "won" || stage === "lost" ? STAGE_PATH.length - 1 : STAGE_PATH.indexOf(stage);
  const gap = stepGap(submittedAt, STAGE_PATH.length + 1);
  for (let step = 1; step <= reached; step += 1) {
    log.unshift({
      id: `${id}-a${step}`,
      type: "stage-changed",
      description: `Stage changed from ${STAGE_LABEL[STAGE_PATH[step - 1] as PipelineStage]} to ${STAGE_LABEL[STAGE_PATH[step] as PipelineStage]}`,
      actorId: assigneeId,
      createdAt: addDays(submittedAt, step * gap),
    });
  }
  if (stage === "won" || stage === "lost") {
    log.unshift({
      id: `${id}-final`,
      type: stage === "won" ? "deal-won" : "deal-lost",
      description: stage === "won" ? "Deal marked Won" : "Deal marked Lost",
      actorId: assigneeId,
      createdAt: addDays(submittedAt, (STAGE_PATH.length + 1) * gap),
    });
  }
  return log;
}

function buildLead(index: number, month: MonthKey): Lead {
  const id = `lead-${String(index + 1).padStart(3, "0")}`;
  const lastDay = month === REFERENCE_DATE.slice(0, 7) ? 5 : 28;
  const submittedAt = `${month}-${pad(random.int(1, lastDay))}T${pad(random.int(8, 18))}:${pad(random.int(0, 59))}:00.000Z`;
  const isSpam = random.chance(0.16);
  const first = random.pick(FIRST_NAMES);
  const last = random.pick(LAST_NAMES);
  const companyName = `${random.pick(COMPANY_PREFIXES)} ${random.pick(COMPANY_SUFFIXES)}`;
  const domain = `${companyName.toLowerCase().replace(/[^a-z]+/g, "")}.example`;
  const form = random.pick(FORMS);
  const channel = weighted(SOURCES.map((entry) => [entry, entry.weight] as const));
  const isRecent = month >= "2026-09";
  const stage: PipelineStage = isSpam ? "spam" : weighted(isRecent ? RECENT_STAGES : MATURE_STAGES);
  const assigneeId = stage === "new" || stage === "spam" ? null : random.pick(["courtney", "maya"]);
  const hasValue = stage === "won" || stage === "proposal" || stage === "lost";
  const referrers = REFERRERS[channel.source];
  const campaigns = CAMPAIGNS[channel.source];

  const notes: LeadNote[] =
    assigneeId && random.chance(0.6)
      ? [{ id: `${id}-n0`, authorId: assigneeId, body: random.pick(NOTE_BODIES), createdAt: addDays(submittedAt, stepGap(submittedAt, 1)) }]
      : [];

  return {
    id,
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`,
    phone: `(202) 555-01${pad(random.int(0, 99))}`,
    company: companyName,
    message: isSpam ? random.pick(SPAM_MESSAGES) : random.pick(MESSAGES),
    formName: form.name,
    pageUrl: form.page,
    submittedAt,
    attribution: {
      source: channel.source,
      medium: channel.medium,
      campaign: campaigns ? random.pick(campaigns) : null,
      landingPage: random.pick(LANDING_PAGES),
      referrer: referrers ? random.pick(referrers) : null,
    },
    stage,
    dealValue: hasValue ? random.int(6, 72) * 500 : null,
    assigneeId,
    spamFilteredBy: isSpam ? "ai" : null,
    notes,
    activity: buildActivity(id, stage, submittedAt, assigneeId),
  };
}

let nextIndex = 0;
export const leads: Lead[] = ACTIVE_MONTHS.flatMap((month) =>
  Array.from({ length: MONTHLY_VOLUME[month] ?? 0 }, () => buildLead(nextIndex++, month)),
).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
