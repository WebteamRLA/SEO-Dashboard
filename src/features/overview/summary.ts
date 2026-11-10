import { formatCurrency, formatNumber } from "@/lib/format";
import type { LeadMetrics, LeadSourceCount, Progress, TaskCounts } from "@/lib/types";

export interface SummaryInput {
  periodText: string;
  tasks: TaskCounts;
  /** Null until the roadmap has a live source; the line is then left out. */
  planProgress: Progress | null;
  leads: LeadMetrics;
  /** Ranked, largest first. */
  sources: LeadSourceCount[];
}

function count(value: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(value)} ${value === 1 ? singular : plural}`;
}

function joinNames(names: string[]): string {
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}

function describeTopSource(sources: LeadSourceCount[]): string | null {
  const top = sources[0];
  if (!top) return null;
  const leaders = sources.filter((row) => row.count === top.count);
  if (leaders.length === 1) return `${top.source} is the largest source with ${count(top.count, "lead")}.`;
  return `${joinNames(leaders.map((row) => row.source))} are tied as the largest sources with ${count(top.count, "lead")} each.`;
}

/** Plain statements derived from the period's figures. Nothing is invented. */
export function buildMonthSummary(input: SummaryInput): string[] {
  const { periodText, tasks, planProgress, leads, sources } = input;
  const lines: string[] = [];

  if (tasks.total === 0) {
    lines.push(`No SEO tasks fall in ${periodText}.`);
  } else {
    lines.push(
      `${formatNumber(tasks.completed)} of ${formatNumber(tasks.total)} tasks are completed (${formatNumber(tasks.inProgress)} in progress, ${formatNumber(tasks.todo)} to do).`,
    );
  }

  if (planProgress && planProgress.total > 0) {
    lines.push(
      `${formatNumber(planProgress.completed)} of ${formatNumber(planProgress.total)} roadmap items for the period are complete (${planProgress.percent}%).`,
    );
  }

  if (leads.genuine === 0) {
    lines.push(
      leads.spam > 0
        ? `No genuine leads in this period. ${count(leads.spam, "submission")} marked as spam.`
        : "No leads were received in this period.",
    );
  } else {
    const organicShare = Math.round((leads.organic / leads.genuine) * 100);
    lines.push(
      `${count(leads.genuine, "genuine lead")}, ${formatNumber(leads.organic)} from Organic Search (${organicShare}%).`,
    );
    const topSource = describeTopSource(sources);
    if (topSource) lines.push(topSource);
  }

  lines.push(
    leads.won > 0
      ? `${count(leads.won, "won deal")} worth ${formatCurrency(leads.wonRevenue)}, from leads submitted in this period.`
      : "No won deals from leads submitted in this period.",
  );
  return lines;
}
