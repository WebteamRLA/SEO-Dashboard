"use client";

import { MonthLink } from "@/components/layout/month-link";
import { useMemo } from "react";
import { CheckCircle2, DollarSign, Inbox, Search, Target, Users } from "lucide-react";
import { ChartCard } from "@/components/charts/chart-card";
import { BarTrendChart, type ChartSeries } from "@/components/charts/charts";
import { RankedBars } from "@/components/charts/ranked-bars";
import { MetricCard, MetricGrid } from "@/components/data/metric-card";
import { ProgressBar } from "@/components/data/progress-bar";
import { StatusBadge } from "@/components/data/status-badge";
import { EmptyState } from "@/components/data/empty-state";
import { useLeads } from "@/features/leads/leads-store";
import {
  computeLeadMetrics,
  computeRevenueSummary,
  countLeadsBySource,
  leadsInMonth,
  STAGE_META,
} from "@/lib/domain/leads";
import { toMonthKey } from "@/lib/month";
import { formatCurrency, formatDate, formatMonthShort, formatNumber } from "@/lib/format";
import type { MonthKey, Progress, TaskCounts } from "@/lib/types";
import { completeMonths } from "@/lib/month";
import { buildMonthSummary } from "./summary";

export interface OverviewProps {
  inProgressMonth: MonthKey;
  month: MonthKey;
  monthLabel: string;
  months: MonthKey[];
  taskCounts: TaskCounts;
  yearlyPlan: Progress;
  monthlyPlan: Progress;
  tasksByMonth: { month: MonthKey; completed: number; open: number }[];
  recentCompleted: {
    id: string;
    name: string;
    category: string;
    assignee: string;
    completedDate: string | null;
  }[];
}

const WORK_SERIES: ChartSeries[] = [
  { key: "completed", label: "Completed", slot: 1 },
  { key: "open", label: "Open", slot: 2 },
];
const LEAD_SERIES: ChartSeries[] = [{ key: "leads", label: "Genuine leads", slot: 1 }];

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-4 ${className ?? ""}`}>
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function OverviewView({
  month,
  inProgressMonth,
  monthLabel,
  months,
  taskCounts,
  yearlyPlan,
  monthlyPlan,
  tasksByMonth,
  recentCompleted,
}: OverviewProps) {
  const { leads } = useLeads();

  const stats = useMemo(() => {
    const inMonth = leadsInMonth(leads, month);
    const metrics = computeLeadMetrics(inMonth);
    const sources = countLeadsBySource(inMonth);
    const revenue = computeRevenueSummary(inMonth);
    const recent = inMonth
      .filter((lead) => lead.stage !== "spam")
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      .slice(0, 5);
    const byMonth = months.map((key) => ({
      month: key,
      leads: computeLeadMetrics(leads.filter((lead) => toMonthKey(lead.submittedAt) === key)).genuine,
    }));
    return { metrics, sources, revenue, recent, byMonth };
  }, [leads, month, months]);

  const summary = buildMonthSummary({
    monthLabel,
    tasks: taskCounts,
    monthlyPlan,
    leads: stats.metrics,
    sources: stats.sources,
  });

  const workData = tasksByMonth.map((row) => ({
    label: formatMonthShort(row.month),
    completed: row.completed,
    open: row.open,
  }));
  const leadsByMonth = completeMonths(stats.byMonth, inProgressMonth);
  const leadData = leadsByMonth.map((row) => ({ label: formatMonthShort(row.month), leads: row.leads }));

  return (
    <>
      <MetricGrid className="xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard
          label="Completed tasks"
          value={formatNumber(taskCounts.completed)}
          detail={`of ${formatNumber(taskCounts.total)} this month`}
          icon={CheckCircle2}
        />
        <MetricCard
          label="Yearly strategy progress"
          value={`${yearlyPlan.percent}%`}
          detail={`${yearlyPlan.completed} of ${yearlyPlan.total} items complete`}
          icon={Target}
          footer={<ProgressBar progress={yearlyPlan} label="Yearly strategy progress" />}
        />
        <MetricCard
          label="Monthly plan progress"
          value={`${monthlyPlan.percent}%`}
          detail={`${monthlyPlan.completed} of ${monthlyPlan.total} items complete`}
          icon={Target}
          footer={<ProgressBar progress={monthlyPlan} label="Monthly plan progress" />}
        />
        <MetricCard
          label="Total leads (excl. spam)"
          value={formatNumber(stats.metrics.genuine)}
          detail={`${formatNumber(stats.metrics.spam)} spam excluded`}
          icon={Users}
        />
        <MetricCard
          label="Organic leads"
          value={formatNumber(stats.metrics.organic)}
          detail="Organic Search, excl. spam"
          icon={Search}
        />
        <MetricCard
          label="Won revenue"
          value={formatCurrency(stats.metrics.wonRevenue)}
          detail={`${formatNumber(stats.metrics.won)} won ${stats.metrics.won === 1 ? "deal" : "deals"}, from this month's leads`}
          icon={DollarSign}
        />
      </MetricGrid>

      <Section title={`Performance summary, ${monthLabel}`}>
        <ul className="flex list-disc flex-col gap-1 pl-4 text-sm text-muted-foreground marker:text-border">
          {summary.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard
          title="SEO work completion"
          description="Tasks by month: completed and open (to do plus in progress)"
          table={{
            columns: ["Month", "Completed", "Open"],
            rows: tasksByMonth.map((row) => ({
              key: row.month,
              cells: [
                row.month === month ? `${formatMonthShort(row.month)} (selected)` : formatMonthShort(row.month),
                formatNumber(row.completed),
                formatNumber(row.open),
              ],
            })),
          }}
        >
          <BarTrendChart data={workData} series={WORK_SERIES} stacked />
        </ChartCard>
        <ChartCard
          title="Leads overview"
          description="Genuine leads by month, spam excluded. Complete months only"
          table={{
            columns: ["Month", "Genuine leads"],
            rows: leadsByMonth.map((row) => ({
              key: row.month,
              cells: [
                row.month === month ? `${formatMonthShort(row.month)} (selected)` : formatMonthShort(row.month),
                formatNumber(row.leads),
              ],
            })),
          }}
        >
          <BarTrendChart data={leadData} series={LEAD_SERIES} />
        </ChartCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <ChartCard
          title="Lead source distribution"
          description={`${monthLabel}, spam excluded`}
          className="lg:col-span-2"
          table={{
            columns: ["Source", "Leads"],
            rows: stats.sources.map((row) => ({ key: row.source, cells: [row.source, formatNumber(row.count)] })),
          }}
        >
          {stats.sources.length === 0 ? (
            <EmptyState icon={Inbox} title="No leads this month" />
          ) : (
            <RankedBars
              label="Leads by source"
              rows={stats.sources.map((row) => ({ label: row.source, value: row.count }))}
            />
          )}
        </ChartCard>
        <Section title="Revenue summary">
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Total won</dt>
              <dd className="font-medium tabular-nums">{formatCurrency(stats.revenue.totalWon)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Won deals</dt>
              <dd className="font-medium tabular-nums">{formatNumber(stats.revenue.wonDeals)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Average deal</dt>
              <dd className="font-medium tabular-nums">{formatCurrency(stats.revenue.averageDeal)}</dd>
            </div>
          </dl>
        </Section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Recent leads">
          {stats.recent.length === 0 ? (
            <EmptyState icon={Inbox} title="No leads this month" />
          ) : (
            <ul className="divide-y divide-border">
              {stats.recent.map((lead) => (
                <li key={lead.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <MonthLink
                      href={`/leads/${lead.id}`}
                      className="block truncate text-sm font-medium hover:underline focus-visible:underline"
                    >
                      {lead.name}
                    </MonthLink>
                    <p className="truncate text-xs text-muted-foreground">
                      {lead.attribution.source} · {formatDate(lead.submittedAt)}
                    </p>
                  </div>
                  <StatusBadge tone={STAGE_META[lead.stage].tone} label={STAGE_META[lead.stage].label} />
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Recent completed tasks">
          {recentCompleted.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No completed tasks this month" />
          ) : (
            <ul className="divide-y divide-border">
              {recentCompleted.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{task.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {task.category} · {task.assignee}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDate(task.completedDate)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
