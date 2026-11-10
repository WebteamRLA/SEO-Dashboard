"use server";

import { applyLeadPatch, applyNote, applyStageChange, type LeadChangeContext } from "@/lib/domain/leads";
import type { Lead, LeadPatch, PipelineStage } from "@/lib/types";
import { requireSessionUser } from "@/server/auth/session";
import { createDb, releaseDb } from "@/server/db/client";
import {
  addedEntries,
  changedColumns,
  dealValueSchema,
  firstIssue,
  leadIdSchema,
  leadPatchSchema,
  noteSchema,
  stageSchema,
} from "./edits";
import { LEAD_INCLUDE, toLead } from "./to-lead";
import { describeError } from "@/server/log";

/**
 * Saves lead edits made in the dashboard. Every action checks the session,
 * validates its input, applies the same rules the screen applied, and writes
 * the change with its history entry in one transaction. Any signed-in user may
 * edit leads; roles do not restrict it yet.
 */

export type LeadEditResult = { ok: true; lead: Lead } | { ok: false; error: string };

const NOT_SAVED = "The change could not be saved. Try again.";

async function saveEdit(
  rawId: unknown,
  change: (lead: Lead, context: LeadChangeContext) => Lead,
  check?: (db: ReturnType<typeof createDb>) => Promise<string | null>,
): Promise<LeadEditResult> {
  const user = await requireSessionUser();
  const id = leadIdSchema.safeParse(rawId);
  if (!id.success) return { ok: false, error: "This lead no longer exists." };

  const db = createDb();
  try {
    const problem = check ? await check(db) : null;
    if (problem) return { ok: false, error: problem };

    const row = await db.lead.findUnique({ where: { id: id.data }, include: LEAD_INCLUDE });
    if (!row) return { ok: false, error: "This lead no longer exists." };
    const before = toLead(row);

    const now = new Date();
    const context: LeadChangeContext = {
      actorId: user.id,
      actorName: user.name || user.email,
      now: now.toISOString(),
      eventId: crypto.randomUUID(),
    };
    let after: Lead;
    try {
      after = change(before, context);
    } catch (error) {
      // The domain rules throw only for invalid requests, with a message meant for people.
      return { ok: false, error: error instanceof Error ? error.message : NOT_SAVED };
    }
    if (after === before) return { ok: true, lead: before };

    const { notes, events } = addedEntries(before, after);
    await db.$transaction([
      db.lead.update({ where: { id: before.id }, data: { ...changedColumns(before, after), editedAt: now } }),
      db.leadNote.createMany({
        data: notes.map((note) => ({
          id: note.id,
          leadId: before.id,
          authorId: note.authorId,
          authorName: note.authorName,
          body: note.body,
          createdAt: new Date(note.createdAt),
        })),
      }),
      db.leadEvent.createMany({
        data: events.map((event) => ({
          id: event.id,
          leadId: before.id,
          type: event.type,
          description: event.description,
          actorId: event.actorId,
          actorName: event.actorName,
          createdAt: new Date(event.createdAt),
        })),
      }),
    ]);

    const saved = await db.lead.findUnique({ where: { id: before.id }, include: LEAD_INCLUDE });
    return saved ? { ok: true, lead: toLead(saved) } : { ok: false, error: "This lead no longer exists." };
  } catch (error) {
    console.error("Lead edit failed:", describeError(error));
    return { ok: false, error: NOT_SAVED };
  } finally {
    await releaseDb(db);
  }
}

/** Moves a lead to a stage. Won needs a deal value above zero. */
export async function moveLeadStage(id: string, stage: PipelineStage, dealValue?: number): Promise<LeadEditResult> {
  const parsedStage = stageSchema.safeParse(stage);
  if (!parsedStage.success) return { ok: false, error: "Choose a valid stage." };
  const parsedValue = dealValue === undefined ? undefined : dealValueSchema.safeParse(dealValue);
  if (parsedValue && !parsedValue.success) return { ok: false, error: "Enter a deal value greater than zero." };
  return saveEdit(id, (lead, context) => applyStageChange(lead, parsedStage.data, context, parsedValue?.data));
}

export async function addLeadNote(id: string, body: string): Promise<LeadEditResult> {
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  return saveEdit(id, (lead, context) => applyNote(lead, parsed.data, context));
}

/** Contact details, deal value, and assignee. The assignee must be a dashboard user. */
export async function updateLeadDetails(id: string, patch: LeadPatch): Promise<LeadEditResult> {
  const parsed = leadPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { assigneeId } = parsed.data;
  return saveEdit(
    id,
    (lead, context) => applyLeadPatch(lead, parsed.data, context),
    assigneeId
      ? async (db) =>
          (await db.user.findUnique({ where: { id: assigneeId }, select: { id: true } }))
            ? null
            : "That person no longer has access to the dashboard."
      : undefined,
  );
}
