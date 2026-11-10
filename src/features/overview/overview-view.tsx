"use client";

import { PeriodLink } from "@/components/layout/period-link";
import { useMemo } from "react";
import { ArrowRight, CheckCircle2, DollarSign, Inbox, Search, Target, Users } from "lucide-react";
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
  STAGE_META,
} from "@/lib/domain/leads";
import { isWithin, monthsInRange, type DateRange } from "@/lib/date-range";
import { toMonthKey } from "@/lib/month";
import { formatCurrency, formatDate, formatMonthShort, formatNumber } from "@/lib/format";
import type { MonthKey, Progress, TaskCounts } from "@/lib/types";
import { completeMonths } from "@/lib/month";
import { buildMonthSummary } from "./summary";

export interface OverviewProps {
  inProgressMonth: MonthKey;
  range: DateRange;
  periodText: string;
  months: MonthKey[];
  taskCounts: TaskCounts;
  /** Null until the strategy roadmap has a live source. */
  yearlyPlan: Progress | null;
  planProgress: Progress | null;
  tasksByMonth: { month: MonthKey; completed: number; open: number }[];
  recentCompleted: {
    id: string;
    name: string;
    category: string;
    assignee: string;
    completedDate: string | null;
  }[];
}

const ROADMAP_NOT_CONNECTED =
  "Not connected yet. Roadmap progress appears once roadmap items are marked in Teamwork.";

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
  range,
  inProgressMonth,
  periodText,
  months,
  taskCounts,
  yearlyPlan,
  planProgress,
  tasksByMonth,
  recentCompleted,
}: OverviewProps) {
  const { leads } = useLeads();

  const stats = useMemo(() => {
    const inPeriod = leads.filter((lead) => isWithin(lead.submittedAt, range));
    const metrics = computeLeadMetrics(inPeriod);
    const sources = countLeadsBySource(inPeriod);
    const revenue = computeRevenueSummary(inPeriod);
    const recent = inPeriod
      .filter((lead) => lead.stage !== "spam")
      .sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""))
      .slice(0, 5);
    const byMonth = months.map((key) => ({
      month: key,
      leads: computeLeadMetrics(
        leads.filter((lead) => lead.submittedAt !== null && toMonthKey(lead.submittedAt) === key),
      ).genuine,
    }));
    return { metrics, sources, revenue, recent, byMonth };
  }, [leads, range, months]);

  const periodMonths = useMemo(() => new Set(monthsInRange(range)), [range]);
  const marked = (key: MonthKey) =>
    periodMonths.has(key) ? `${formatMonthShort(key)} (in period)` : formatMonthShort(key);

  const summary = buildMonthSummary({
    periodText,
    tasks: taskCounts,
    planProgress,
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
      <MetricGrid className="xl:grid-cols-3 2xl:grid-cols-5">
        <MetricCard
          label="Completed tasks"
          value={formatNumber(taskCounts.completed)}
          detail={`of ${formatNumber(taskCounts.total)} in this period`}
          icon={CheckCircle2}
        />
        {planProgress ? (
          <MetricCard
            label="Plan progress"
            value={`${planProgress.percent}%`}
            detail={`${planProgress.completed} of ${planProgress.total} roadmap items complete in this period`}
            icon={Target}
            footer={<ProgressBar progress={planProgress} label="Plan progress" />}
          />
        ) : (
          <MetricCard label="Plan progress" value="—" detail={ROADMAP_NOT_CONNECTED} icon={Target} />
        )}
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
          detail={`${formatNumber(stats.metrics.won)} won ${stats.metrics.won === 1 ? "deal" : "deals"}, from leads in this period`}
          icon={DollarSign}
        />
      </MetricGrid>

      <div className="grid gap-5 lg:grid-cols-3">
        <Section title={`Performance summary, ${periodText}`} className="lg:col-span-2">
          <ul className="flex list-disc flex-col gap-1 pl-4 text-sm text-muted-foreground marker:text-border">
            {summary.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Section>
        <Section title="Yearly strategy progress">
          {yearlyPlan ? (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-2xl font-semibold tracking-tight tabular-nums">{yearlyPlan.percent}%</p>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(yearlyPlan.completed)} of {formatNumber(yearlyPlan.total)} items complete
                </p>
              </div>
              <ProgressBar progress={yearlyPlan} label="Yearly strategy progress" />
              <p className="text-xs text-muted-foreground">The whole year&apos;s plan, not only the selected period.</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{ROADMAP_NOT_CONNECTED}</p>
          )}
          <PeriodLink
            href="/roadmap"
            className="mt-auto inline-flex items-center gap-1 self-start text-sm font-medium text-primary hover:underline focus-visible:underline"
          >
            View SEO Roadmap
            <ArrowRight className="size-3.5" aria-hidden />
          </PeriodLink>
        </Section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard
          title="SEO work completion"
          description="Tasks by month: completed and open (to do plus in progress)"
          table={{
            columns: ["Month", "Completed", "Open"],
            rows: tasksByMonth.map((row) => ({
              key: row.month,
              cells: [
                marked(row.month),
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
                marked(row.month),
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
          description={`${periodText}, spam excluded`}
          className="lg:col-span-2"
          table={{
            columns: ["Source", "Leads"],
            rows: stats.sources.map((row) => ({ key: row.source, cells: [row.source, formatNumber(row.count)] })),
          }}
        >
          {stats.sources.length === 0 ? (
            <EmptyState icon={Inbox} title="No leads in this period" />
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
            <EmptyState icon={Inbox} title="No leads in this period" />
          ) : (
            <ul className="divide-y divide-border">
              {stats.recent.map((lead) => (
                <li key={lead.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <PeriodLink
                      href={`/leads/${lead.id}`}
                      className="block truncate text-sm font-medium hover:underline focus-visible:underline"
                    >
                      {lead.name}
                    </PeriodLink>
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
            <EmptyState icon={CheckCircle2} title="No completed tasks in this period" />
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
