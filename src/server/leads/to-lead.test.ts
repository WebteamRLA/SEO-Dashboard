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
