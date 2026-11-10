import { describe, expect, it } from "vitest";
import { PIPELINE_STAGES } from "@/lib/types";
import { toMonthKey } from "@/lib/month";
import { REFERENCE_DATE } from "./calendar";
import { leads } from "./leads";
import { deliveryModules, integrations } from "./operations";
import { roadmapItems, tasks } from "./work";

/** Sample data must never show something impossible, even in a preview. */
describe("sample data invariants", () => {
  const today = `${REFERENCE_DATE}T23:59:59.999Z`;

  it("uses unique ids", () => {
    for (const ids of [leads.map((l) => l.id), tasks.map((t) => t.id), roadmapItems.map((r) => r.id)]) {
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("has no lead event after today", () => {
    for (const lead of leads) {
      const events = [lead.submittedAt, ...lead.activity.map((a) => a.createdAt), ...lead.notes.map((n) => n.createdAt)];
      for (const event of events) expect(event !== null && event <= today).toBe(true);
    }
  });

  it("lists lead activity newest first", () => {
    for (const lead of leads) {
      const times = lead.activity.map((a) => a.createdAt);
      expect(times).toEqual([...times].sort().reverse());
    }
  });

  it("gives every won lead a positive deal value", () => {
    const won = leads.filter((lead) => lead.stage === "won");
    expect(won.length).toBeGreaterThan(0);
    for (const lead of won) expect(lead.dealValue).toBeGreaterThan(0);
  });

  it("tags spam, and only spam, as filtered", () => {
    for (const lead of leads) {
      expect(lead.spamFilteredBy !== null).toBe(lead.stage === "spam");
    }
  });

  it("only uses reserved, non-routable contact details", () => {
    for (const lead of leads) {
      expect(lead.email?.endsWith(".example")).toBe(true);
      expect(lead.phone).toMatch(/555-01\d\d$/);
    }
  });

  it("uses every pipeline stage, so each column has content", () => {
    const stages = new Set(leads.map((lead) => lead.stage));
    for (const stage of PIPELINE_STAGES) expect(stages.has(stage)).toBe(true);
  });

  it("has won revenue in the default month", () => {
    expect(leads.some((lead) => lead.stage === "won" && lead.submittedAt !== null && toMonthKey(lead.submittedAt) === "2026-10")).toBe(true);
  });

  it("keeps a task's dates consistent with its status and month", () => {
    for (const task of tasks) {
      expect(toMonthKey(task.dueDate)).toBe(task.month);
      expect(task.completedDate !== null).toBe(task.status === "completed");
      if (task.completedDate) expect(task.completedDate <= REFERENCE_DATE).toBe(true);
    }
  });

  it("links roadmap items only to tasks in the same month and category", () => {
    const byId = new Map(tasks.map((task) => [task.id, task]));
    for (const item of roadmapItems) {
      for (const id of item.taskIds) {
        expect(byId.get(id)).toMatchObject({ month: item.month, category: item.category });
      }
    }
  });

  it("does not invent delivery dates or claim a live connection", () => {
    for (const entry of deliveryModules) expect(entry.plannedDate).toBeNull();
    for (const integration of integrations) expect(integration.status).not.toBe("connected");
  });
});
