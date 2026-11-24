import "server-only";
import { getLeads } from "@/lib/data/leads";
import { getStrategies } from "@/lib/data/strategy";
import { getWorkTrackerData } from "@/lib/data/work";
import type { MonthKey } from "@/lib/types";
import {
  fetchBehavior,
  fetchSearchBreakdown,
  fetchSearchTotals,
  fetchTrafficBreakdown,
  fetchTrafficTotals,
} from "@/server/google/client";
import { GoogleConfigError } from "@/server/google/config";
import type { ReportWindow } from "@/server/google/reports";
import { TeamworkConfigError } from "@/server/teamwork/config";
import {
  leadSection,
  monthRange,
  pickMovers,
  previousMonth,
  strategySection,
  workSection,
  type MonthlyReportData,
  type ReportSection,
} from "./assemble";

const TOP = 10;

/** Runs one section; a missing setup or a failed source becomes a message, never a thrown error. */
async function section<T>(name: string, load: () => Promise<T>): Promise<ReportSection<T>> {
  try {
    return { status: "ok", data: await load() };
  } catch (error) {
    const message = error instanceof Error ? error.message : `Could not load ${name}.`;
    if (error instanceof GoogleConfigError || error instanceof TeamworkConfigError) {
      return { status: "not-connected", message };
    }
    console.error(`Monthly report: ${name} failed:`, message);
    return { status: "error", message };
  }
}

/**
 * Every live figure for one complete month, compared with the month before.
 * Google calls go through the shared 10-minute cache, so reopening a report is cheap.
 */
export async function buildMonthlyReport(month: MonthKey): Promise<MonthlyReportData> {
  const range = monthRange(month);
  const previousRange = monthRange(previousMonth(month));
  const days = Number(range.to.slice(8, 10));
  const window: ReportWindow = { current: range, previous: previousRange, days };

  const [search, traffic, conversions, leads, work, strategy] = await Promise.all([
    section("Search Console", async () => {
      const [totals, breakdown] = await Promise.all([fetchSearchTotals(window), fetchSearchBreakdown(window)]);
      return {
        totals,
        topQueries: breakdown.keywords.slice(0, TOP),
        topPages: breakdown.pages.slice(0, TOP),
        ...pickMovers(breakdown.keywords),
      };
    }),
    section("Google Analytics", async () => {
      const [totals, breakdown] = await Promise.all([fetchTrafficTotals(window), fetchTrafficBreakdown(window)]);
      return { totals, channels: breakdown.channels };
    }),
    section("Google Analytics", async () => {
      const behavior = await fetchBehavior(window);
      return {
        current: behavior.totals.current.keyEvents,
        previous: behavior.totals.previous.keyEvents,
        byEvent: behavior.keyEvents,
        topPages: behavior.enquiryPages.slice(0, TOP),
      };
    }),
    section("leads", async () => leadSection(await getLeads(), month)),
    section("Teamwork", async () => workSection((await getWorkTrackerData()).tasks, month)),
    section("strategies", async () => {
      const strategies = await getStrategies();
      if (strategies.length === 0) throw new Error("No strategies imported yet.");
      return strategySection(strategies);
    }),
  ]);

  return { month, range, previousRange, generatedAt: new Date().toISOString(), search, traffic, conversions, leads, work, strategy };
}
