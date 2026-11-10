import { describe, expect, it } from "vitest";
import { applyLeadPatch, applyNote, applyStageChange } from "@/lib/domain/leads";
import type { Lead } from "@/lib/types";
import { addedEntries, changedColumns, dealValueSchema, leadPatchSchema, noteSchema, stageSchema } from "./edits";

const context = { actorId: "user-1", actorName: "Courtney", now: "2026-11-10T10:00:00.000Z", eventId: "e1" };

function lead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "lead-1",
    origin: "sheet",
    name: "Ada Lane",
    email: "ada@acme.example",
    phone: null,
    company: "Acme",
    message: null,
    formName: null,
    pageUrl: null,
    submittedAt: "2026-11-01T09:00:00.000Z",
    attribution: { source: "Organic Search", heardFrom: null, medium: null, campaign: null, landingPage: null, referrer: null },
    stage: "new",
    dealValue: null,
    pipelineNote: null,
    wonOn: null,
    payments: [],
    assigneeId: null,
    spamFilteredBy: null,
    notes: [],
    activity: [],
    ...overrides,
  };
}

describe("changedColumns", () => {
  it("stores a Won move as the stage and deal value, nothing else", () => {
    const before = lead();
    const after = applyStageChange(before, "won", context, 9000);
    expect(changedColumns(before, after)).toEqual({ stage: "won", dealValue: 9000 });
  });

  it("tags manual spam and clears the tag when the lead is rescued", () => {
    const spam = applyStageChange(lead(), "spam", context);
    expect(changedColumns(lead(), spam)).toEqual({ stage: "spam", spamFilteredBy: "courtney" });
    const rescued = applyStageChange(spam, "contacted", { ...context, eventId: "e2" });
    expect(changedColumns(spam, rescued)).toEqual({ stage: "contacted", spamFilteredBy: null });
  });

  it("stores only the contact fields that changed", () => {
    const before = lead();
    const after = applyLeadPatch(before, { name: "Ada Lane", email: null, company: "Acme Ltd" }, context);
    expect(changedColumns(before, after)).toEqual({ email: null, company: "Acme Ltd" });
  });

  it("finds nothing to store for a note", () => {
    const before = lead();
    expect(changedColumns(before, applyNote(before, "Called back", context))).toEqual({});
  });
});

describe("addedEntries", () => {
  it("returns the new note and its history entry, signed by the person", () => {
    const before = lead({ activity: [{ id: "old", type: "created", description: "Imported", actorId: null, actorName: null, createdAt: "2026-11-01T09:00:00.000Z" }] });
    const { notes, events } = addedEntries(before, applyNote(before, "  Called back  ", context));
    expect(notes).toEqual([{ id: "note-lead-1-e1", authorId: "user-1", authorName: "Courtney", body: "Called back", createdAt: context.now }]);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "note-added", actorName: "Courtney" });
  });
});

describe("validation", () => {
  it("accepts only known stages", () => {
    expect(stageSchema.safeParse("won").success).toBe(true);
    expect(stageSchema.safeParse("archived").success).toBe(false);
  });

  it("rounds deal values to cents and rejects zero, negative, and absurd amounts", () => {
    expect(dealValueSchema.parse(1234.567)).toBe(1234.57);
    for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY, 2_000_000_000]) {
      expect(dealValueSchema.safeParse(bad).success).toBe(false);
    }
  });

  it("trims notes and refuses empty or huge ones", () => {
    expect(noteSchema.parse("  hi  ")).toBe("hi");
    expect(noteSchema.safeParse("   ").success).toBe(false);
    expect(noteSchema.safeParse("x".repeat(5001)).success).toBe(false);
  });

  it("normalises a contact patch: blank optional fields become null", () => {
    expect(leadPatchSchema.parse({ name: " Ada ", email: "", phone: "  ", company: null })).toEqual({
      name: "Ada",
      email: null,
      phone: null,
      company: null,
    });
  });

  it("rejects bad emails, empty names, and fields that cannot be edited", () => {
    expect(leadPatchSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
    expect(leadPatchSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(leadPatchSchema.safeParse({ stage: "won" }).success).toBe(false);
    expect(leadPatchSchema.safeParse({ origin: "manual" }).success).toBe(false);
  });
});
