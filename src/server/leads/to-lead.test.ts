import { describe, expect, it } from "vitest";
import { toLead, type LeadRow } from "./to-lead";

// Made-up people only: this repository is public.
function row(overrides: Partial<LeadRow> = {}): LeadRow {
  return {
    id: "l1",
    origin: "sheet",
    submittedAt: new Date("2026-10-28T18:01:42.000Z"),
    name: "Ada Example",
    email: "ada@example.com",
    company: "Example Co",
    heardFrom: "ChatGPT",
    channel: "AI Search",
    budget: null,
    services: null,
    message: null,
    stage: "won",
    pipelineNote: "Signed after one call",
    wonOn: new Date("2026-11-02T00:00:00.000Z"),
    payments: [],
    ...overrides,
  };
}

describe("toLead", () => {
  it("maps a sheet lead", () => {
    expect(toLead(row())).toMatchObject({
      id: "l1",
      origin: "sheet",
      name: "Ada Example",
      submittedAt: "2026-10-28T18:01:42.000Z",
      attribution: { source: "AI Search", heardFrom: "ChatGPT", landingPage: null },
      stage: "won",
      pipelineNote: "Signed after one call",
      wonOn: "2026-11-02",
      dealValue: null,
      message: null,
    });
  });

  it("sums payments into the deal value, in order", () => {
    const decimal = (value: string) => ({ toString: () => value });
    const lead = toLead(
      row({
        payments: [
          { sequence: 2, amount: decimal("6250.00"), commission: null },
          { sequence: 1, amount: decimal("3354.84"), commission: decimal("335.48") },
        ],
      }),
    );
    expect(lead.payments).toEqual([
      { sequence: 1, amount: 3354.84, commission: 335.48 },
      { sequence: 2, amount: 6250, commission: null },
    ]);
    expect(lead.dealValue).toBe(9604.84);
  });

  it("falls back to the company, then the email, for the name", () => {
    expect(toLead(row({ name: null })).name).toBe("Example Co");
    expect(toLead(row({ name: null, company: null })).name).toBe("ada@example.com");
    expect(toLead(row({ name: null, company: null, email: null })).name).toBe("Unnamed lead");
  });

  it("never passes an unknown stage, channel, or origin to the screens", () => {
    const lead = toLead(row({ stage: "pondering", channel: "Billboard", origin: "fax", submittedAt: null, wonOn: null }));
    expect(lead).toMatchObject({ stage: "new", origin: "manual", submittedAt: null, wonOn: null });
    expect(lead.attribution.source).toBe("Unknown");
  });

  it("joins form answers into the message", () => {
    expect(toLead(row({ message: "Need help", services: "SEO", budget: "$5k" })).message).toBe(
      "Need help\n\nServices: SEO\n\nBudget: $5k",
    );
  });
});

describe("toLead with dashboard edits", () => {
  it("prefers a deal value typed in the dashboard over the sheet's revenue", () => {
    const lead = toLead(row({ dealValue: { toString: () => "4200.50" }, payments: [{ sequence: 1, amount: { toString: () => "1000" }, commission: null }] }));
    expect(lead.dealValue).toBe(4200.5);
  });

  it("falls back to the sheet's revenue when no value was typed", () => {
    const lead = toLead(row({ dealValue: null, payments: [{ sequence: 1, amount: { toString: () => "1000" }, commission: null }] }));
    expect(lead.dealValue).toBe(1000);
  });

  it("maps notes and history newest first, with the names stored at the time", () => {
    const lead = toLead(
      row({
        assigneeId: "user-1",
        spamFilteredBy: "courtney",
        notes: [
          { id: "n1", authorId: null, authorName: "Former colleague", body: "First", createdAt: new Date("2026-11-01T10:00:00Z") },
          { id: "n2", authorId: "user-1", authorName: "Courtney", body: "Second", createdAt: new Date("2026-11-02T10:00:00Z") },
        ],
        events: [
          { id: "e1", type: "stage-changed", description: "Stage changed from New to Contacted", actorId: "user-1", actorName: "Courtney", createdAt: new Date("2026-11-01T09:00:00Z") },
          { id: "e2", type: "something-unknown", description: "Odd", actorId: null, actorName: null, createdAt: new Date("2026-11-03T09:00:00Z") },
        ],
      }),
    );
    expect(lead.assigneeId).toBe("user-1");
    expect(lead.spamFilteredBy).toBe("courtney");
    expect(lead.notes.map((note) => [note.id, note.authorName])).toEqual([["n2", "Courtney"], ["n1", "Former colleague"]]);
    expect(lead.activity.map((entry) => [entry.id, entry.type])).toEqual([["e2", "details-updated"], ["e1", "stage-changed"]]);
  });
});
