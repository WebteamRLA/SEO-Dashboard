import { describe, expect, it } from "vitest";
import { mapStrategyRows, parsePercent, parseSheetDate } from "./sheet";

// Made-up rows: the real strategy sheet must never be committed (the repo is public).
const row = (cells: Record<number, string>) => Array.from({ length: 20 }, (_, i) => cells[i] ?? "");

describe("parseSheetDate", () => {
  it("reads the sheet's date styles", () => {
    expect(parseSheetDate("May 18, 2026")).toBe("2026-05-18");
    expect(parseSheetDate("Sept 3, 2026")).toBe("2026-09-03");
    expect(parseSheetDate("2026-08-01")).toBe("2026-08-01");
    expect(parseSheetDate("8/1/2026")).toBe("2026-08-01");
  });
  it("rejects impossible or unreadable dates", () => {
    expect(parseSheetDate("February 30, 2026")).toBeNull();
    expect(parseSheetDate("soon")).toBeNull();
    expect(parseSheetDate("")).toBeNull();
  });
});

describe("parsePercent", () => {
  it("reads and clamps percentages", () => {
    expect(parsePercent("30%")).toBe(30);
    expect(parsePercent("75")).toBe(75);
    expect(parsePercent("140%")).toBe(100);
    expect(parsePercent("")).toBeNull();
    expect(parsePercent("n/a")).toBeNull();
  });
});

describe("mapStrategyRows", () => {
  const rows = [
    row({ 0: "Priority", 1: "Goal Type", 2: "Strategy" }),
    row({ 0: "Primary", 1: "Leads", 2: "Funnels", 3: "Build page", 4: "May 18, 2026", 7: "90 days", 8: "10 leads/month", 9: "4 leads/month", 11: "30%", 12: "In Progress", 14: "https://docs.example.com/x", 19: "Task Link" }),
    row({ 2: "Tool", 3: "Free tool", 7: "45", 12: "In Progress" }),
    row({}),
    row({ 0: "Secondary", 1: "Traffic", 2: "Content", 4: "someday", 12: "" }),
    row({ 2: "Content" }),
    row({ 7: "30 days", 12: "Planned" }),
  ];
  const { strategies, skipped, warnings } = mapStrategyRows(rows);

  it("skips the header and blank rows, and fills merged priority and goal cells down", () => {
    expect(strategies.map((s) => [s.priority, s.goalType, s.initiative])).toEqual([
      ["Primary", "Leads", "Funnels"],
      ["Primary", "Leads", "Tool"],
      ["Secondary", "Traffic", "Content"],
    ]);
  });

  it("parses dates, KPIs, progress, and keeps only real URLs", () => {
    expect(strategies[0]).toMatchObject({
      startDate: "2026-05-18",
      kpiTarget: "10 leads/month",
      kpiCurrent: "4 leads/month",
      workProgress: 30,
      status: "In Progress",
      evidenceUrl: "https://docs.example.com/x",
      taskUrl: null,
      sortOrder: 0,
    });
    expect(strategies[1]!.duration).toBe("45 days");
  });

  it("defaults a blank status to Planned and warns about unreadable dates", () => {
    expect(strategies[2]!.status).toBe("Planned");
    expect(warnings).toEqual([{ rowNumber: 5, message: 'could not read the start date "someday"' }]);
  });

  it("reports duplicates and rows without a title", () => {
    expect(skipped).toEqual([
      { rowNumber: 6, message: "duplicate of an earlier row (Content)" },
      { rowNumber: 7, message: "no initiative or action" },
    ]);
  });
});
