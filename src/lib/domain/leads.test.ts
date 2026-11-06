import { describe, expect, it } from "vitest";
import type { Lead } from "@/lib/types";
import {
  applyLeadPatch,
  applyNote,
  applyStageChange,
  computeLeadMetrics,
  computeMonthlyRevenue,
  computeRevenueBySource,
  computeRevenueSummary,
  countLeadsBySource,
  leadPatchChanges,
  leadsInMonth,
} from "./leads";

const context = { actorId: "courtney", now: "2026-11-06T10:00:00Z", eventId: "1" };

function lead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "lead-1",
    name: "Ada Lane",
    email: "ada@acme.example",
    phone: "(202) 555-0100",
    company: "Acme",
    message: "Hello",
    formName: "Contact Form",
    pageUrl: "/contact",
    submittedAt: "2026-10-05T09:00:00Z",
    attribution: {
      source: "Organic Search",
      medium: "organic",
      campaign: null,
      landingPage: "/seo",
      referrer: null,
    },
    stage: "new",
    dealValue: null,
    assigneeId: null,
    spamFilteredBy: null,
    notes: [],
    activity: [],
    ...overrides,
  };
}

describe("computeLeadMetrics", () => {
  it("separates spam from genuine and never counts spam as organic", () => {
    const metrics = computeLeadMetrics([
      lead(),
      lead({ stage: "spam" }),
      lead({ stage: "won", dealValue: 5000 }),
      lead({ stage: "won", dealValue: null }),
    ]);
    expect(metrics).toEqual({
      total: 4,
      genuine: 3,
      spam: 1,
      organic: 3,
      won: 2,
      wonRevenue: 5000,
    });
  });
});

describe("leadsInMonth", () => {
  it("matches on the submission month", () => {
    const leads = [lead(), lead({ submittedAt: "2026-11-01T00:00:00Z" })];
    expect(leadsInMonth(leads, "2026-10")).toHaveLength(1);
  });
});

describe("countLeadsBySource", () => {
  it("ranks sources, excludes spam, and drops empty sources", () => {
    const referral = (stage: Lead["stage"] = "new") =>
      lead({ stage, attribution: { ...lead().attribution, source: "Referral" } });
    const rows = countLeadsBySource([lead(), referral(), referral(), referral("spam")]);
    expect(rows).toEqual([
      { source: "Referral", count: 2 },
      { source: "Organic Search", count: 1 },
    ]);
  });
});

describe("revenue", () => {
  const leads = [
    lead({ stage: "won", dealValue: 4000 }),
    lead({ stage: "won", dealValue: 2001, submittedAt: "2026-11-02T00:00:00Z" }),
    lead({ stage: "proposal", dealValue: 9000 }),
  ];

  it("counts won deals only, ignoring open pipeline value", () => {
    expect(computeRevenueSummary(leads)).toEqual({
      totalWon: 6001,
      wonDeals: 2,
      averageDeal: 3001,
    });
  });

  it("does not divide by zero with no won deals", () => {
    expect(computeRevenueSummary([]).averageDeal).toBe(0);
  });

  it("returns a row per requested month, including empty months", () => {
    expect(computeMonthlyRevenue(leads, ["2026-09", "2026-10"])).toEqual([
      { month: "2026-09", revenue: 0, deals: 0 },
      { month: "2026-10", revenue: 4000, deals: 1 },
    ]);
  });

  it("ranks revenue by source", () => {
    expect(computeRevenueBySource(leads)).toEqual([
      { source: "Organic Search", revenue: 6001, deals: 2 },
    ]);
  });
});

describe("applyStageChange", () => {
  it("records stage changes newest first", () => {
    const moved = applyStageChange(lead(), "contacted", context);
    expect(moved.stage).toBe("contacted");
    expect(moved.activity[0]).toMatchObject({
      type: "stage-changed",
      description: "Stage changed from New to Contacted",
      actorId: "courtney",
    });
  });

  it("is a no-op when the stage does not change", () => {
    const original = lead();
    expect(applyStageChange(original, "new", context)).toBe(original);
  });

  it("requires a positive deal value to mark Won", () => {
    expect(() => applyStageChange(lead(), "won", context)).toThrow(/deal value/i);
    expect(() => applyStageChange(lead(), "won", context, 0)).toThrow(/deal value/i);
    const won = applyStageChange(lead(), "won", context, 7500);
    expect(won).toMatchObject({ stage: "won", dealValue: 7500 });
    expect(won.activity[0]?.type).toBe("deal-won");
  });

  it("records a lost deal and keeps its existing value", () => {
    const lost = applyStageChange(lead({ stage: "proposal", dealValue: 900 }), "lost", context);
    expect(lost.dealValue).toBe(900);
    expect(lost.activity[0]?.type).toBe("deal-lost");
  });

  it("tags manual spam as filtered by Courtney", () => {
    expect(applyStageChange(lead(), "spam", context).spamFilteredBy).toBe("courtney");
  });

  it("clears the spam tag when a lead is rescued", () => {
    const rescued = applyStageChange(
      lead({ stage: "spam", spamFilteredBy: "ai" }),
      "new",
      context,
    );
    expect(rescued.spamFilteredBy).toBeNull();
  });
});

describe("applyNote", () => {
  it("trims the note and logs activity", () => {
    const noted = applyNote(lead(), "  Called back  ", context);
    expect(noted.notes[0]?.body).toBe("Called back");
    expect(noted.activity[0]?.type).toBe("note-added");
  });

  it("ignores blank notes", () => {
    const original = lead();
    expect(applyNote(original, "   ", context)).toBe(original);
  });
});

describe("applyLeadPatch", () => {
  it("updates fields and logs activity", () => {
    const patched = applyLeadPatch(lead(), { company: "New Co" }, context);
    expect(patched.company).toBe("New Co");
    expect(patched.activity[0]?.type).toBe("details-updated");
  });

  it("does nothing when no field actually changes", () => {
    const original = lead({ company: "Acme" });
    expect(applyLeadPatch(original, { company: "Acme" }, context)).toBe(original);
    expect(leadPatchChanges(original, { company: "Acme" })).toBe(false);
    expect(leadPatchChanges(original, { company: "Other" })).toBe(true);
  });
});
