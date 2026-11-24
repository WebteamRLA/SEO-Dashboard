import { describe, expect, it } from "vitest";
import type { KeywordRow } from "@/server/google/analytics";
import type { Task } from "@/lib/types";
import { completeMonths, isReportableMonth, looksLikeToolQuery, monthRange, pickMovers, previousMonth, workSection } from "./assemble";

describe("months", () => {
  it("gives a month's first and last day, including leap years", () => {
    expect(monthRange("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(monthRange("2028-02")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
    expect(monthRange("2026-12")).toEqual({ from: "2026-12-01", to: "2026-12-31" });
  });
  it("steps back across a year", () => {
    expect(previousMonth("2026-01")).toBe("2025-12");
    expect(previousMonth("2026-11")).toBe("2026-10");
  });
  it("lists complete months, newest first", () => {
    expect(completeMonths("2026-02-10", 3)).toEqual(["2026-01", "2025-12", "2025-11"]);
  });
  it("only reports on complete, well-formed months", () => {
    expect(isReportableMonth("2026-10", "2026-11-23")).toBe(true);
    expect(isReportableMonth("2026-11", "2026-11-23")).toBe(false);
    expect(isReportableMonth("2026-13", "2026-11-23")).toBe(false);
    expect(isReportableMonth("../x", "2026-11-23")).toBe(false);
  });
});

const kw = (query: string, positionChange: number | null, impressions = 100, clicks = 1): KeywordRow => ({
  query,
  clicks,
  impressions,
  ctr: 1,
  position: 5,
  positionChange,
});

describe("pickMovers", () => {
  it("ranks the biggest gains and drops, ignoring rare and new queries", () => {
    const { improved, declined } = pickMovers([
      kw("a", 3),
      kw("b", 8),
      kw("c", -2),
      kw("d", -6),
      kw("rare", 20, 5),
      kw("new", null),
      kw("flat", 0),
      kw("https://seolater.com/blog/x", -9),
      kw("-site:facebook.com -site:fb.me saas marketing", -8),
    ]);
    expect(improved.map((r) => r.query)).toEqual(["b", "a"]);
    expect(declined.map((r) => r.query)).toEqual(["d", "c"]);
  });
});

describe("looksLikeToolQuery", () => {
  it("spots URLs and search operators but keeps real searches", () => {
    expect(looksLikeToolQuery("www.rightleftagency.com")).toBe(true);
    expect(looksLikeToolQuery("inurl:saas agency")).toBe(true);
    expect(looksLikeToolQuery("saas seo agency")).toBe(false);
    expect(looksLikeToolQuery("[b2b saas sales]")).toBe(false);
  });
});

const task = (id: string, overrides: Partial<Task>): Task => ({
  id,
  name: id,
  category: "General tasks",
  project: "SEO",
  assigneeId: "",
  status: "todo",
  month: "2026-10",
  dueDate: "2026-10-15",
  completedDate: null,
  ...overrides,
});

describe("workSection", () => {
  it("counts work completed in the month and the month before, and work still open", () => {
    const section = workSection(
      [
        task("done-oct", { status: "completed", completedDate: "2026-10-20", url: "https://x/1" }),
        task("done-oct-early", { status: "completed", completedDate: "2026-10-02" }),
        task("done-sep", { status: "completed", completedDate: "2026-09-30" }),
        task("open-oct", { dueDate: "2026-10-31" }),
        task("open-nov", { dueDate: "2026-11-05" }),
        task("no-due", { dueDate: "" }),
      ],
      "2026-10",
    );
    expect(section).toMatchObject({ completed: 2, previousCompleted: 1, open: 1 });
    expect(section.completedTasks.map((t) => [t.id, t.url])).toEqual([
      ["done-oct", "https://x/1"],
      ["done-oct-early", null],
    ]);
  });
});
