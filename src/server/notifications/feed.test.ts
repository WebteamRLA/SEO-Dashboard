import { describe, expect, it } from "vitest";
import type { Lead, Task } from "@/lib/types";
import { buildNotificationFeed, MAX_ITEMS } from "./feed";

const today = "2026-11-10";

function lead(id: string, overrides: Partial<Lead> = {}): Lead {
  return {
    id,
    origin: "website-form",
    name: `Person ${id}`,
    email: null,
    phone: null,
    company: null,
    message: null,
    formName: "Contact form",
    pageUrl: null,
    submittedAt: "2026-11-09T15:00:00.000Z",
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
  } as Lead;
}

function task(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    name: `Task ${id}`,
    category: "On-Page",
    project: "RLA SEO",
    assigneeId: "",
    status: "todo",
    month: "2026-11",
    dueDate: "2026-11-20",
    completedDate: null,
    ...overrides,
  };
}

const feed = (input: Partial<Parameters<typeof buildNotificationFeed>[0]>) =>
  buildNotificationFeed({ leads: [], tasks: [], today, seenAt: null, ...input });

describe("buildNotificationFeed", () => {
  it("announces recent real leads and links to them", () => {
    const [item] = feed({ leads: [lead("a")] });
    expect(item).toEqual({
      id: "lead-a",
      kind: "lead",
      title: "New lead: Person a",
      description: "Organic Search · Contact form",
      createdAt: "2026-11-09T15:00:00.000Z",
      href: "/leads/a",
      read: false,
    });
  });

  it("leaves out spam, undated, and older leads", () => {
    const items = feed({
      leads: [
        lead("spam", { stage: "spam" }),
        lead("undated", { submittedAt: null }),
        lead("old", { submittedAt: "2026-10-27T12:00:00.000Z" }),
        lead("edge", { submittedAt: "2026-10-28T12:00:00.000Z" }),
      ],
    });
    expect(items.map((item) => item.id)).toEqual(["lead-edge"]);
  });

  it("omits the form name when the lead has none", () => {
    const [item] = feed({ leads: [lead("a", { formName: null })] });
    expect(item?.description).toBe("Organic Search");
  });

  it("announces tasks completed in the last week, at their exact time when known", () => {
    const items = feed({
      tasks: [
        task("timed", { status: "completed", completedDate: "2026-11-08", completedAt: "2026-11-08T18:30:00Z" }),
        task("dated", { status: "completed", completedDate: "2026-11-04" }),
        task("old", { status: "completed", completedDate: "2026-11-03" }),
      ],
    });
    expect(items.map((item) => [item.id, item.createdAt])).toEqual([
      ["done-timed", "2026-11-08T18:30:00Z"],
      ["done-dated", "2026-11-04T00:00:00.000Z"],
    ]);
    expect(items[0]).toMatchObject({ kind: "task-completed", description: "Task timed", href: "/work" });
  });

  it("flags open tasks past their due date, dated the day they became overdue", () => {
    const items = feed({
      tasks: [
        task("late", { dueDate: "2026-11-05", status: "in-progress" }),
        task("due-today", { dueDate: today }),
        task("no-date", { dueDate: "" }),
        task("done-late", { dueDate: "2026-11-01", status: "completed", completedDate: "2026-10-01" }),
      ],
    });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "overdue-late",
      kind: "task-overdue",
      createdAt: "2026-11-06T00:00:00.000Z",
    });
    expect(items[0]?.description).toContain("Task late · was due");
  });

  it("puts the newest first and caps the list", () => {
    const leads = Array.from({ length: 6 }, (_, i) => lead(`l${i}`, { submittedAt: `2026-11-0${i + 1}T12:00:00.000Z` }));
    const tasks = Array.from({ length: 6 }, (_, i) => task(`t${i}`, { dueDate: `2026-10-2${i}` }));
    const items = feed({ leads, tasks });
    expect(items).toHaveLength(MAX_ITEMS);
    // Five per kind at most, so the oldest lead (l0) never makes it.
    expect(items[0]?.id).toBe("lead-l5");
    expect(items.some((item) => item.id === "lead-l0")).toBe(false);
    const times = items.map((item) => Date.parse(item.createdAt));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it("marks items read only if they are no newer than the last time the menu was opened", () => {
    const items = feed({
      leads: [lead("before", { submittedAt: "2026-11-08T10:00:00.000Z" }), lead("after", { submittedAt: "2026-11-09T10:00:00.000Z" })],
      seenAt: "2026-11-08T10:00:00.000Z",
    });
    expect(items.map((item) => [item.id, item.read])).toEqual([
      ["lead-after", false],
      ["lead-before", true],
    ]);
  });

  it("returns nothing when there is nothing to report", () => {
    expect(feed({})).toEqual([]);
  });
});
