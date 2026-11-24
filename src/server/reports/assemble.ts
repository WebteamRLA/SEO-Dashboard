import { computeLeadMetrics, countLeadsBySource, leadsInMonth } from "@/lib/domain/leads";
import { goalAchievement, summarizeStrategies } from "@/lib/domain/strategy";
import type { DateRange } from "@/lib/date-range";
import type {
  ISODate,
  Lead,
  LeadMetrics,
  LeadSourceCount,
  MonthKey,
  Strategy,
  Task,
} from "@/lib/types";
import type { ChannelRow, KeywordRow, PageRow } from "@/server/google/analytics";
import type { EnquiryLandingPage, KeyEventRow } from "@/server/google/engagement";
import type { Comparison, SearchTotals, TrafficTotals } from "@/server/google/reports";

/**
 * The monthly report: its data shape and the pure helpers that build it.
 * Network and database calls live in build.ts; this file is tested on its own.
 */

/** One report section: its data, or why it is missing. Serializable, so it can be stored as a snapshot. */
export type ReportSection<T> =
  | { status: "ok"; data: T }
  | { status: "not-connected" | "empty" | "error"; message: string };

export interface SearchSection {
  totals: Comparison<SearchTotals>;
  topQueries: KeywordRow[];
  topPages: PageRow[];
  improved: KeywordRow[];
  declined: KeywordRow[];
}

export interface TrafficSection {
  totals: Comparison<TrafficTotals>;
  channels: ChannelRow[];
}

export interface ConversionSection {
  current: number;
  previous: number;
  byEvent: KeyEventRow[];
  topPages: EnquiryLandingPage[];
}

export interface LeadSection {
  current: LeadMetrics;
  previous: LeadMetrics;
  bySource: LeadSourceCount[];
}

export interface ReportTask {
  id: string;
  name: string;
  category: string;
  url: string | null;
  completedDate: string | null;
}

export interface WorkSection {
  completed: number;
  previousCompleted: number;
  /** Still open at the end of the month (due in or before it). */
  open: number;
  completedTasks: ReportTask[];
}

export interface StrategyLine {
  goalType: string;
  initiative: string;
  kpiTarget: string | null;
  kpiCurrent: string | null;
  achieved: number | null;
  workProgress: number | null;
  status: string;
}

export interface StrategySection {
  items: StrategyLine[];
  averageAchievement: number | null;
  averageWork: number | null;
}

export interface MonthlyReportData {
  month: MonthKey;
  range: DateRange;
  previousRange: DateRange;
  generatedAt: string;
  search: ReportSection<SearchSection>;
  traffic: ReportSection<TrafficSection>;
  conversions: ReportSection<ConversionSection>;
  leads: ReportSection<LeadSection>;
  work: ReportSection<WorkSection>;
  strategy: ReportSection<StrategySection>;
}

// ---------------------------------------------------------------- Months

const pad = (n: number) => String(n).padStart(2, "0");

export function isMonthKey(value: string): value is MonthKey {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** First and last day of a month, e.g. 2026-02 → 2026-02-01 … 2026-02-28. */
export function monthRange(month: MonthKey): DateRange {
  const [year, mon] = month.split("-").map(Number) as [number, number];
  const last = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${pad(last)}` };
}

export function previousMonth(month: MonthKey): MonthKey {
  const [year, mon] = month.split("-").map(Number) as [number, number];
  return mon === 1 ? `${year - 1}-12` : `${year}-${pad(mon - 1)}`;
}

/** The `count` most recent complete months before `today`'s month, newest first. */
export function completeMonths(today: ISODate, count: number): MonthKey[] {
  const months: MonthKey[] = [];
  let month = previousMonth(today.slice(0, 7));
  for (let i = 0; i < count; i += 1) {
    months.push(month);
    month = previousMonth(month);
  }
  return months;
}

/** Reports cover complete months only: a month still in progress would compare a part-month with a whole one. */
export function isReportableMonth(month: string, today: ISODate): month is MonthKey {
  return isMonthKey(month) && month < today.slice(0, 7);
}

// ---------------------------------------------------------------- Search

/** Queries need this many impressions to count as movers, so one-off searches do not dominate. */
export const MOVER_MIN_IMPRESSIONS = 20;

/**
 * Scraper and rank-checking tools search with URLs and operators ("site:", "-site:fb.me", "https://…").
 * Those are not people looking for RLA, so they are left out of the movers.
 */
export function looksLikeToolQuery(query: string): boolean {
  return /https?:\/\/|www\.|\b(site|inurl|intitle|intext|related|cache):/i.test(query) || query.length > 80;
}

export function pickMovers(keywords: readonly KeywordRow[], limit = 5): { improved: KeywordRow[]; declined: KeywordRow[] } {
  const comparable = keywords.filter(
    (row) =>
      row.positionChange !== null &&
      row.positionChange !== 0 &&
      row.impressions >= MOVER_MIN_IMPRESSIONS &&
      !looksLikeToolQuery(row.query),
  );
  return {
    improved: comparable
      .filter((row) => row.positionChange! > 0)
      .sort((a, b) => b.positionChange! - a.positionChange! || b.clicks - a.clicks)
      .slice(0, limit),
    declined: comparable
      .filter((row) => row.positionChange! < 0)
      .sort((a, b) => a.positionChange! - b.positionChange! || b.clicks - a.clicks)
      .slice(0, limit),
  };
}

// ---------------------------------------------------------------- Leads

export function leadSection(leads: readonly Lead[], month: MonthKey): LeadSection {
  // Same month rule as the Leads pages: submission time in the reporting time zone.
  const current = leadsInMonth(leads, month);
  return {
    current: computeLeadMetrics(current),
    previous: computeLeadMetrics(leadsInMonth(leads, previousMonth(month))),
    bySource: countLeadsBySource(current),
  };
}

// ---------------------------------------------------------------- Work

const within = (date: string | null, range: DateRange) => date !== null && date >= range.from && date <= range.to;

export function workSection(tasks: readonly Task[], month: MonthKey, limit = 15): WorkSection {
  const range = monthRange(month);
  const previous = monthRange(previousMonth(month));
  const completed = tasks
    .filter((task) => task.status === "completed" && within(task.completedDate, range))
    .sort((a, b) => (b.completedDate ?? "").localeCompare(a.completedDate ?? ""));
  return {
    completed: completed.length,
    previousCompleted: tasks.filter((task) => task.status === "completed" && within(task.completedDate, previous)).length,
    // Approximation from today's state: tasks due by the month's end that are not done yet.
    open: tasks.filter((task) => task.status !== "completed" && task.dueDate !== "" && task.dueDate <= range.to).length,
    completedTasks: completed.slice(0, limit).map((task) => ({
      id: task.id,
      name: task.name,
      category: task.category,
      url: task.url ?? null,
      completedDate: task.completedDate,
    })),
  };
}

// ---------------------------------------------------------------- Strategy

export function strategySection(strategies: readonly Strategy[]): StrategySection {
  const summary = summarizeStrategies(strategies);
  return {
    items: [...strategies]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((strategy) => ({
        goalType: strategy.goalType,
        initiative: strategy.initiative,
        kpiTarget: strategy.kpiTarget,
        kpiCurrent: strategy.kpiCurrent,
        achieved: goalAchievement(strategy.kpiTarget, strategy.kpiCurrent),
        workProgress: strategy.workProgress,
        status: strategy.status,
      })),
    averageAchievement: summary.averageAchievement,
    averageWork: summary.averageWork,
  };
}
