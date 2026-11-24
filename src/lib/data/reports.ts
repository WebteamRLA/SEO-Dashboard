import "server-only";
import { leadsInMonth, computeLeadMetrics } from "@/lib/domain/leads";
import type { MonthKey, ReportStatus, Role } from "@/lib/types";
import { requireSessionUser } from "@/server/auth/session";
import { createDb, releaseDb } from "@/server/db/client";
import { searchTrend, trafficTrend } from "@/server/google/analytics";
import { fetchSearchBreakdown, fetchTrafficBreakdown } from "@/server/google/client";
import { completeMonths, monthRange, type MonthlyReportData } from "@/server/reports/assemble";
import { buildMonthlyReport } from "@/server/reports/build";
import { getLeads } from "./leads";

export type { MonthlyReportData } from "@/server/reports/assemble";

/** Months listed on the Reports page. */
const LIST_MONTHS = 12;

/** Admins and managers write notes and finalise; members read. */
export function canEditReports(role: Role): boolean {
  return role === "admin" || role === "manager";
}

export interface ReportNotes {
  highlights: string;
  missed: string;
  nextMonth: string;
}

export interface MonthlyReportView {
  month: MonthKey;
  status: ReportStatus;
  notes: ReportNotes;
  data: MonthlyReportData;
  finalizedAt: string | null;
  canEdit: boolean;
}

const notesOf = (row: { highlights: string | null; missed: string | null; nextMonth: string | null } | null): ReportNotes => ({
  highlights: row?.highlights ?? "",
  missed: row?.missed ?? "",
  nextMonth: row?.nextMonth ?? "",
});

const statusOf = (value: string | undefined): ReportStatus => (value === "ready" || value === "sent" ? value : "draft");

/** One month's report: the frozen snapshot once finalised, otherwise live figures. */
export async function getMonthlyReport(month: MonthKey): Promise<MonthlyReportView> {
  const user = await requireSessionUser();
  const db = createDb();
  let row;
  try {
    row = await db.monthlyReport.findUnique({ where: { month } });
  } finally {
    await releaseDb(db);
  }
  const status = statusOf(row?.status);
  const frozen = status !== "draft" && row?.snapshot ? (row.snapshot as unknown as MonthlyReportData) : null;
  return {
    month,
    status,
    notes: notesOf(row ?? null),
    data: frozen ?? (await buildMonthlyReport(month)),
    finalizedAt: row?.finalizedAt?.toISOString() ?? null,
    canEdit: canEditReports(user.role),
  };
}

export interface ReportListRow {
  month: MonthKey;
  status: ReportStatus;
  organicClicks: number | null;
  sessions: number | null;
  organicSessions: number | null;
  leads: number | null;
}

/**
 * The last twelve complete months with headline figures. Finalised months show
 * their snapshot; the rest come from one Search Console and one GA4 query over
 * the whole span, plus the lead table.
 */
export async function getReportList(today: string): Promise<ReportListRow[]> {
  await requireSessionUser();
  const months = completeMonths(today, LIST_MONTHS);
  const span = { from: monthRange(months[months.length - 1]!).from, to: monthRange(months[0]!).to };
  // The span's own "previous period" is not shown; one day keeps that extra query small.
  const window = { current: span, previous: { from: span.from, to: span.from }, days: 366 };

  const db = createDb();
  let rows;
  try {
    rows = await db.monthlyReport.findMany({ where: { month: { in: months } } });
  } finally {
    await releaseDb(db);
  }
  const saved = new Map(rows.map((row) => [row.month, row]));

  const [search, traffic, leads] = await Promise.all([
    fetchSearchBreakdown(window).then((data) => searchTrend(data.daily, span, "month")).catch(() => null),
    fetchTrafficBreakdown(window).then((data) => trafficTrend(data.daily, span, "month")).catch(() => null),
    getLeads().catch(() => null),
  ]);
  const byMonth = <T extends { start: string }>(points: T[] | null, month: string) => points?.find((p) => p.start.startsWith(month));

  return months.map((month) => {
    const row = saved.get(month);
    const status = statusOf(row?.status);
    const snapshot = status !== "draft" && row?.snapshot ? (row.snapshot as unknown as MonthlyReportData) : null;
    if (snapshot) {
      return {
        month,
        status,
        organicClicks: snapshot.search.status === "ok" ? snapshot.search.data.totals.current.clicks : null,
        sessions: snapshot.traffic.status === "ok" ? snapshot.traffic.data.totals.current.sessions : null,
        organicSessions: snapshot.traffic.status === "ok" ? snapshot.traffic.data.totals.current.organicSessions : null,
        leads: snapshot.leads.status === "ok" ? snapshot.leads.data.current.genuine : null,
      };
    }
    const s = byMonth(search, month);
    const t = byMonth(traffic, month);
    return {
      month,
      status,
      // No impressions at all means Search Console has no data for the month (the property starts in 2026).
      organicClicks: s && s.impressions > 0 ? s.clicks : null,
      sessions: t ? t.sessions : null,
      organicSessions: t ? t.organicSessions : null,
      leads: leads ? computeLeadMetrics(leadsInMonth(leads, month)).genuine : null,
    };
  });
}
