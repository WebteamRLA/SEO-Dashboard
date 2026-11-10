import { z } from "zod";
import { PIPELINE_STAGES, type Lead, type LeadActivity, type LeadNote } from "@/lib/types";

/**
 * Validation and change detection for lead edits made in the dashboard. Pure,
 * so the rules are tested without a database. The Server Actions in
 * `actions.ts` apply the shared rules from `lib/domain/leads`, then store what
 * changed with these helpers.
 */

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const leadIdSchema = z.string().trim().min(1).max(100);
export const stageSchema = z.enum(PIPELINE_STAGES);

/** USD, above zero, at most a billion, rounded to cents. */
export const dealValueSchema = z
  .number()
  .finite()
  .positive()
  .max(1_000_000_000)
  .transform((value) => Math.round(value * 100) / 100);

export const noteSchema = z.string().trim().min(1, "Write a note first.").max(5000, "Keep notes under 5,000 characters.");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => value || null);

export const leadPatchSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a name.").max(200),
    email: optionalText(254).refine((value) => value === null || EMAIL_SHAPE.test(value), "Enter an email like name@example.com."),
    phone: optionalText(50),
    company: optionalText(200),
    dealValue: dealValueSchema.nullable(),
    assigneeId: z.string().trim().min(1).max(100).nullable(),
  })
  .partial()
  .strict();

/** The `lead` columns a dashboard edit may change. */
export interface LeadColumnChanges {
  stage?: string;
  dealValue?: number | null;
  spamFilteredBy?: string | null;
  assigneeId?: string | null;
  name?: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
}

/** Only the columns whose value differs between the stored lead and the edited one. */
export function changedColumns(before: Lead, after: Lead): LeadColumnChanges {
  const changes: LeadColumnChanges = {};
  if (after.stage !== before.stage) changes.stage = after.stage;
  if (after.dealValue !== before.dealValue) changes.dealValue = after.dealValue;
  if (after.spamFilteredBy !== before.spamFilteredBy) changes.spamFilteredBy = after.spamFilteredBy;
  if (after.assigneeId !== before.assigneeId) changes.assigneeId = after.assigneeId;
  if (after.name !== before.name) changes.name = after.name;
  if (after.email !== before.email) changes.email = after.email;
  if (after.phone !== before.phone) changes.phone = after.phone;
  if (after.company !== before.company) changes.company = after.company;
  return changes;
}

/** Notes and history entries the edit added; the domain rules only ever prepend. */
export function addedEntries(before: Lead, after: Lead): { notes: LeadNote[]; events: LeadActivity[] } {
  const noteIds = new Set(before.notes.map((note) => note.id));
  const eventIds = new Set(before.activity.map((entry) => entry.id));
  return {
    notes: after.notes.filter((note) => !noteIds.has(note.id)),
    events: after.activity.filter((entry) => !eventIds.has(entry.id)),
  };
}

/** The first validation message, for showing to the person who made the edit. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "That change is not valid.";
}
