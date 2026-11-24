import type { Lead, LeadSource, PipelineColumn, PipelineStage } from "@/lib/types";

/** The fields of a Pipeline card the dashboard reads. */
export interface PipelineTask {
  id: number;
  name: string;
  description?: string | null;
  status: string;
  createdAt: string | null;
  updatedAt?: string | null;
  completedAt?: string | null;
  startDate: string | null;
  dueDate: string | null;
  tagIds: number[] | null;
  assigneeUserIds: number[] | null;
  workflowStages?: { workflowId: number; stageId: number }[] | null;
}

export interface PipelineIncluded {
  users?: Record<string, { id: number; firstName?: string; lastName?: string }>;
  tags?: Record<string, { id: number; name?: string }>;
}

/** Teamwork's own column for cards not placed in a stage. */
export const BACKLOG_COLUMN: PipelineColumn = { id: 0, name: "Backlog", order: 0, color: "#9ca3af" };

/**
 * Board columns map to the dashboard's stage groups, which drive the counts
 * (open pipeline, won, lost). Matched by name, so renaming a column in
 * Teamwork keeps working as long as the wording stays recognisable; anything
 * unrecognised counts as an open lead that has been contacted.
 */
export function stageForColumn(column: PipelineColumn): PipelineStage {
  const name = column.name.toLowerCase();
  if (column.id === 0) return "new";
  if (/\bwon\b/.test(name)) return "won";
  if (/\blost\b/.test(name)) return "lost";
  if (/proposal|quote|offer/.test(name)) return "proposal";
  if (/call|meeting|analysis/.test(name)) return "meeting";
  return "contacted";
}

/** Card tags as the dashboard's lead sources. The first recognised tag wins. */
const TAG_SOURCES: { pattern: RegExp; source: LeadSource }[] = [
  { pattern: /organic.*\bai\b|\bai\b.*search|chatgpt/i, source: "AI Search" },
  { pattern: /organic|seo|search/i, source: "Organic Search" },
  { pattern: /referral|upsell/i, source: "Referral" },
  { pattern: /email/i, source: "Email" },
  { pattern: /social|linkedin|facebook|instagram/i, source: "Social" },
  { pattern: /conference|event|expo\b|trade ?show/i, source: "Event" },
  { pattern: /\bppc\b|paid|ads?\b/i, source: "Paid Search" },
  { pattern: /direct/i, source: "Direct" },
];

export function sourceForTags(tags: readonly string[]): LeadSource {
  for (const tag of tags) {
    const match = TAG_SOURCES.find((entry) => entry.pattern.test(tag));
    if (match) return match.source;
  }
  return "Unknown";
}

/** The card's source: its tags, else what its "Source:" line names, else Unknown. */
export function sourceFor(tags: readonly string[], sourceLine: string | null): LeadSource {
  const fromTags = sourceForTags(tags.filter((tag) => !/^unknown$/i.test(tag.trim())));
  if (fromTags !== "Unknown" || !sourceLine) return fromTags;
  return sourceForTags([sourceLine]);
}

export interface CardDetails {
  source: string | null;
  contactName: string | null;
  contactEmail: string | null;
  website: string | null;
  notes: string | null;
}

const FIELD_LABELS = ["Source", "Contact Name", "Contact Email", "Website", "Notes"] as const;

/** `[text](url)` and `<url>` to plain text, so a Markdown link reads as its target. */
function plain(value: string): string {
  return value
    .replace(/\[([^\]]*)\]\((?:mailto:)?([^)]*)\)/g, (_, text: string, url: string) => text || url)
    .replace(/<\/?[^>]+>/g, " ")
    // Markdown escapes and hard line breaks ("\\", "\\_") carry no meaning here.
    .replace(/\\(.?)/g, "$1")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Reads the card template the team fills in ("Source: … Contact Name: …
 * Contact Email: … Website: … Notes: …"). Fields may sit on one line or
 * several; a missing or empty field is null. Notes keep their line breaks.
 */
export function parseCardDescription(description: string | null | undefined): CardDetails {
  const empty: CardDetails = { source: null, contactName: null, contactEmail: null, website: null, notes: null };
  if (!description) return empty;
  const text = description.replace(/\r\n/g, "\n").replace(/<br\s*\/?>/gi, "\n");
  const labels = FIELD_LABELS.map((label) => label.replace(" ", "\\s+")).join("|");
  const pattern = new RegExp(`(?:^|\\s|\\*\\*)(${labels})[ \\t]*:[ \\t]*(?:\\*\\*)?`, "gi");
  const hits = [...text.matchAll(pattern)];
  if (hits.length === 0) return { ...empty, notes: plain(text) || null };

  const result = { ...empty };
  hits.forEach((hit, index) => {
    const start = (hit.index ?? 0) + hit[0].length;
    const end = hits[index + 1]?.index ?? text.length;
    const raw = text.slice(start, end);
    const label = hit[1]!.toLowerCase().replace(/\s+/g, " ");
    const cleaned =
      label === "notes"
        ? raw.split("\n").map(plain).join("\n").replace(/\n{3,}/g, "\n\n").trim()
        : plain(raw.replace(/\n/g, " "));
    if (!cleaned) return;
    if (label === "source") result.source = cleaned;
    else if (label === "contact name") result.contactName = cleaned;
    else if (label === "contact email") result.contactEmail = cleaned;
    else if (label === "website") result.website = cleaned;
    else result.notes = cleaned;
  });
  return result;
}

const day = (value: string | null | undefined) => (value ? value.slice(0, 10) : null);

function personName(user: { firstName?: string; lastName?: string } | undefined): string | null {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  return name || null;
}

/**
 * One Pipeline card as a dashboard lead. Teamwork has no deal values, so
 * `dealValue` stays empty: revenue is to come from QuickBooks.
 */
export function toPipelineLead(
  task: PipelineTask,
  columns: ReadonlyMap<number, PipelineColumn>,
  included: PipelineIncluded | undefined,
  baseUrl: string,
): Lead {
  const stageId = task.workflowStages?.[0]?.stageId ?? 0;
  const column = columns.get(stageId) ?? BACKLOG_COLUMN;
  const stage = stageForColumn(column);
  const tags = (task.tagIds ?? [])
    .map((id) => included?.tags?.[String(id)]?.name)
    .filter((name): name is string => Boolean(name));
  const assignees = (task.assigneeUserIds ?? [])
    .map((id) => personName(included?.users?.[String(id)]))
    .filter((name): name is string => Boolean(name));
  const details = parseCardDescription(task.description);
  const closedAt = task.completedAt ?? task.updatedAt ?? null;

  return {
    id: `tw-${task.id}`,
    origin: "teamwork",
    name: task.name.trim() || details.contactName || details.contactEmail || "Untitled card",
    email: details.contactEmail,
    phone: null,
    company: details.contactName,
    message: details.notes,
    formName: null,
    pageUrl: null,
    submittedAt: task.createdAt,
    attribution: {
      // Tags first; when they name no source, the card's "Source:" line ("ChatGPT", "LinkedIn").
      source: sourceFor(tags, details.source),
      heardFrom: details.source,
      medium: null,
      campaign: null,
      landingPage: null,
      referrer: null,
    },
    stage,
    dealValue: null,
    pipelineNote: null,
    wonOn: stage === "won" ? day(closedAt) : null,
    payments: [],
    assigneeId: null,
    spamFilteredBy: null,
    notes: [],
    activity: task.createdAt
      ? [
          {
            id: `tw-${task.id}-created`,
            type: "created",
            description: "Card created in Teamwork",
            actorId: null,
            actorName: null,
            createdAt: task.createdAt,
          },
        ]
      : [],
    teamwork: {
      taskId: task.id,
      url: `${baseUrl}/app/tasks/${task.id}`,
      column,
      tags,
      assignees,
      contactName: details.contactName,
      website: details.website,
      startDate: day(task.startDate),
      dueDate: day(task.dueDate),
      updatedAt: task.updatedAt ?? null,
    },
  };
}

/**
 * The board's open cards, newest first. Completed cards are left out, as on
 * Teamwork's own board.
 */
export function toPipelineLeads(
  tasks: readonly PipelineTask[],
  columns: readonly PipelineColumn[],
  included: PipelineIncluded | undefined,
  baseUrl: string,
): Lead[] {
  const byId = new Map(columns.map((column) => [column.id, column]));
  return tasks
    .filter((task) => task.status !== "completed")
    .map((task) => toPipelineLead(task, byId, included, baseUrl))
    .sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""));
}
