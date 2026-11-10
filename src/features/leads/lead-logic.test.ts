import { describe, expect, it } from "vitest";
import type { Lead } from "@/lib/types";
import { contactToPatch, filterLeads, groupByStage, parseDealValue, validateContact } from "./lead-logic";

function lead(overrides: Partial<Lead> & { id: string }): Lead {
  return {
    origin: "website-form",
    name: "Test Person",
    email: "test@example.com",
    phone: "",
    company: "Acme",
    message: "",
    formName: "Contact Form",
    pageUrl: "/contact",
    submittedAt: "2026-11-05T10:00:00Z",
    attribution: { source: "Direct", heardFrom: null, medium: "none", campaign: null, landingPage: "/", referrer: null },
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

const all = { search: "", source: "all", period: "all", stage: "all" };
const ref = "2026-11-06";

describe("filterLeads", () => {
  const leads = [
    lead({ id: "a", submittedAt: "2026-11-06T09:00:00Z" }),
    lead({ id: "b", submittedAt: "2026-10-31T00:00:00Z", name: "Zed Quinn" }),
    lead({ id: "c", submittedAt: "2026-10-30T23:59:00Z", stage: "won" }),
    lead({ id: "d", submittedAt: "2026-08-10T00:00:00Z", company: "Harbor Dental" }),
  ];
  const ids = (found: Lead[]) => found.map((item) => item.id);

  it("returns everything for all time", () => {
    expect(ids(filterLeads(leads, all, ref))).toEqual(["a", "b", "c", "d"]);
  });
  it("includes the reference day and the six days before it for 7 days", () => {
    expect(ids(filterLeads(leads, { ...all, period: "7" }, ref))).toEqual(["a", "b"]);
  });
  it("applies 30 and 90 day windows", () => {
    expect(ids(filterLeads(leads, { ...all, period: "30" }, ref))).toEqual(["a", "b", "c"]);
    expect(ids(filterLeads(leads, { ...all, period: "90" }, ref))).toEqual(["a", "b", "c", "d"]);
  });
  it("searches name, email and company, case-insensitively", () => {
    expect(ids(filterLeads(leads, { ...all, search: "zed" }, ref))).toEqual(["b"]);
    expect(ids(filterLeads(leads, { ...all, search: "HARBOR" }, ref))).toEqual(["d"]);
  });
  it("filters by stage", () => {
    expect(ids(filterLeads(leads, { ...all, stage: "won" }, ref))).toEqual(["c"]);
  });
});

describe("groupByStage", () => {
  it("orders columns and totals deal values", () => {
    const columns = groupByStage([
      lead({ id: "a", stage: "won", dealValue: 1000 }),
      lead({ id: "b", stage: "won", dealValue: 500 }),
      lead({ id: "c", stage: "new" }),
    ]);
    expect(columns.map((column) => column.stage)).toEqual([
      "new", "contacted", "meeting", "proposal", "won", "lost", "spam",
    ]);
    expect(columns[4]?.totalValue).toBe(1500);
    expect(columns[0]?.leads).toHaveLength(1);
  });
});

describe("parseDealValue", () => {
  it("accepts positive numbers with currency formatting", () => {
    expect(parseDealValue("$12,500")).toBe(12500);
    expect(parseDealValue(" 99.5 ")).toBe(99.5);
  });
  it("rejects empty, zero, negative and non-numeric input", () => {
    for (const bad of ["", "0", "-5", "abc", "1e3", "12 000"]) expect(parseDealValue(bad)).toBeNull();
  });
});

describe("validateContact", () => {
  const ok = { name: "A", email: "a@b.co", phone: "", company: "" };
  it("passes valid input", () => expect(validateContact(ok)).toEqual({}));
  it("flags empty name and bad email", () => {
    expect(validateContact({ ...ok, name: "  " }).name).toBeDefined();
    expect(validateContact({ ...ok, email: "nope" }).email).toBeDefined();
  });
  it("allows a blank email, since older leads have none", () => {
    expect(validateContact({ ...ok, email: "  " })).toEqual({});
  });
});

describe("contactToPatch", () => {
  it("trims values and turns blank optional fields into null", () => {
    expect(contactToPatch({ name: " A ", email: "", phone: " ", company: "Acme " })).toEqual({
      name: "A",
      email: null,
      phone: null,
      company: "Acme",
    });
  });
});
