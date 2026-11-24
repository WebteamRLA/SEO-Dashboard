"use client";

import { PeriodLink } from "@/components/layout/period-link";
import { useMemo, type ReactNode } from "react";
import { ColumnChart } from "@/components/charts/column-chart";
import { RankedBars } from "@/components/charts/ranked-bars";
import { MetricCard, MetricGrid } from "@/components/data/metric-card";
import { Legend, LegendItem, PageSection, Panel, PanelBlock, PanelColumns } from "@/components/data/panel";
import { ProgressBar } from "@/components/data/progress-bar";
import { StatusBadge } from "@/components/data/status-badge";
import { ExternalLink } from "@/components/data/external-link";
import { useLeads } from "@/features/leads/leads-store";
import { computeLeadMetrics, countLeadsBySource, STAGE_META } from "@/lib/domain/leads";
import type { GoogleOverview } from "@/lib/data/google";
import { isWithin, monthsInRange, type DateRange } from "@/lib/date-range";
import { toMonthKey } from "@/lib/month";
import { formatDate, formatMonthShort, formatNumber } from "@/lib/format";
import type { LeadSource, MonthKey, Progress, TaskCounts } from "@/lib/types";
import { completeMonths } from "@/lib/month";
import { GooglePanels } from "./google-panels";
import { buildMonthSummary } from "./summary";

export interface OverviewProps {
  inProgressMonth: MonthKey;
  range: DateRange;
  periodText: string;
  months: MonthKey[];
  taskCounts: TaskCounts;
  /** Calendar year the yearly figure covers, such as "2026". */
  planYear: string;
  /** Share of SEO tasks in Teamwork completed. Null when Teamwork is unavailable. */
  yearlyPlan: Progress | null;
  planProgress: Progress | null;
  tasksByMonth: { month: MonthKey; completed: number; open: number }[];
  recentCompleted: {
    id: string;
    name: string;
    category: string;
    assignee: string;
    completedDate: string | null;
    url?: string;
  }[];
  /**
   * Search Console and GA4 totals. Optional: the Overview does not load them
   * yet (Phase 2), so the panel only renders when a caller passes them.
   */
  google?: GoogleOverview | null;
}

const TEAMWORK_DOWN = "Teamwork is not available right now";

/** Sources counted as "Search and AI" in the design: drawn blue, the rest grey. */
const SEARCH_SOURCES = new Set<LeadSource>(["Organic Search", "AI Search"]);

const BAR_BLUE = "#0091FF";
const BAR_LIGHT = "#D6E9FB";
const BAR_GREY = "#C4C9D1";

/** The design's "View details" header link. Keeps the selected period. */
function DetailsLink({ href, children = "View details", about }: { href: string; children?: ReactNode; about?: string }) {
  return (
    <PeriodLink
      href={href}
      className="inline-flex h-[30px] items-center rounded-lg px-2.5 text-[13px] font-medium text-primary hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {children}
      {about ? <span className="sr-only"> about {about}</span> : null}
    </PeriodLink>
  );
}

/** Rows of a short list inside a panel block, separated by hairlines. */
function ListRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <li className={`relative flex min-h-11 items-center gap-2.5 border-t border-line-soft py-1.5 ${className ?? ""}`}>
      {children}
    </li>
  );
}

function QuietEmpty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-[13px] text-ink-quiet">{children}</p>;
}

function CheckCircle() {
  return (
    <span aria-hidden className="flex size-5 flex-none items-center justify-center rounded-full bg-tone-good-bg">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 12 5 5 9-10" />
      </svg>
    </span>
  );
}

export function OverviewView({
  range,
  inProgressMonth,
  periodText,
  months,
  taskCounts,
  planYear,
  yearlyPlan,
  planProgress,
  tasksByMonth,
  recentCompleted,
  google,
}: OverviewProps) {
  const { leads } = useLeads();

  const stats = useMemo(() => {
    const inPeriod = leads.filter((lead) => isWithin(lead.submittedAt, range));
    const metrics = computeLeadMetrics(inPeriod);
    const sources = countLeadsBySource(inPeriod);
    const open = inPeriod.filter((lead) => ["new", "contacted", "meeting", "proposal"].includes(lead.stage)).length;
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
    return { metrics, sources, open, recent, byMonth };
  }, [leads, range, months]);

  const periodMonths = useMemo(() => new Set(monthsInRange(range)), [range]);
  const monthLabel = (key: MonthKey) =>
    periodMonths.has(key) ? `${formatMonthShort(key)} (in period)` : formatMonthShort(key);

  const summary = buildMonthSummary({
    periodText,
    tasks: taskCounts,
    // Plan progress is the task completion rate, which the tasks line already states.
    planProgress: null,
    leads: stats.metrics,
    sources: stats.sources,
  });

  const leadsByMonth = completeMonths(stats.byMonth, inProgressMonth);
  const searchLeads = stats.sources
    .filter((row) => SEARCH_SOURCES.has(row.source))
    .reduce((sum, row) => sum + row.count, 0);
  const openTasks = taskCounts.todo + taskCounts.inProgress;

  return (
    <div className="flex flex-col gap-8">
      <PageSection label="Results">
        <MetricGrid>
          <MetricCard
            tone="green"
            label="Leads"
            value={formatNumber(stats.metrics.genuine)}
            detail="Added to the Teamwork Pipeline in this period"
          />
          <MetricCard
            tone="green"
            label="Organic leads"
            value={formatNumber(stats.metrics.organic)}
            detail="Organic Search, excl. spam"
          />
          {/* Teamwork has no deal values, so these count deals; revenue is to come from QuickBooks. */}
          <MetricCard
            tone="amber"
            label="Won"
            value={formatNumber(stats.metrics.won)}
            detail="Leads from this period now in WON"
          />
          <MetricCard
            label="In progress"
            value={formatNumber(stats.open)}
            detail="Leads from this period still open"
          />
        </MetricGrid>

        {google ? <GooglePanels google={google} /> : null}

        <Panel
          title="Leads"
          description="Genuine leads only, spam removed"
          headingLevel={3}
          actions={<DetailsLink href="/leads" about="leads" />}
        >
          <div className="flex flex-col gap-8">
            <PanelColumns>
              <PanelBlock headingLevel={4} title="Leads over time" description="By month · complete months only">
                {leadsByMonth.every((row) => row.leads === 0) ? (
                  <QuietEmpty>No complete months with leads yet.</QuietEmpty>
                ) : (
                  <ColumnChart
                    label="Genuine leads by month"
                    data={leadsByMonth.map((row) => ({ label: formatMonthShort(row.month), value: row.leads }))}
                  />
                )}
              </PanelBlock>
              <PanelBlock
                headingLevel={4}
                title="Where leads came from"
                description={`${formatNumber(searchLeads)} from Organic Search and AI Search · ${periodText}`}
                aside={
                  <Legend>
                    <LegendItem color={BAR_BLUE} label="Search and AI" />
                    <LegendItem color={BAR_GREY} label="Other" />
                  </Legend>
                }
              >
                {stats.sources.length === 0 ? (
                  <QuietEmpty>No leads in this period.</QuietEmpty>
                ) : (
                  <div className="flex flex-1 flex-col justify-center">
                    <RankedBars
                      label="Leads by source"
                      rows={stats.sources.map((row) => ({
                        label: row.source,
                        value: row.count,
                        muted: !SEARCH_SOURCES.has(row.source),
                      }))}
                    />
                  </div>
                )}
              </PanelBlock>
            </PanelColumns>

            <PanelBlock headingLevel={4} title="Recent leads" description="Latest genuine leads in this period">
              {stats.recent.length === 0 ? (
                <QuietEmpty>No leads in this period.</QuietEmpty>
              ) : (
                <ul>
                  {stats.recent.map((lead) => (
                    <ListRow key={lead.id}>
                      <span className="flex min-w-0 flex-1 flex-col leading-[1.35]">
                        <PeriodLink
                          href={`/leads/${lead.id}`}
                          className="truncate text-[13px] font-medium text-ink after:absolute after:inset-0 hover:text-primary focus-visible:underline"
                        >
                          {lead.name}
                        </PeriodLink>
                        <span className="truncate text-xs text-ink-quiet">
                          {lead.attribution.source} · {formatDate(lead.submittedAt)}
                        </span>
                      </span>
                      <StatusBadge tone={STAGE_META[lead.stage].tone} label={STAGE_META[lead.stage].label} />
                    </ListRow>
                  ))}
                </ul>
              )}
            </PanelBlock>
          </div>
        </Panel>
      </PageSection>

      <PageSection label="SEO work">
        <MetricGrid>
          <MetricCard
            tone="blue"
            label="Tasks completed"
            value={formatNumber(taskCounts.completed)}
            suffix={`/${formatNumber(taskCounts.total)}`}
            detail={
              planProgress
                ? `${planProgress.percent}% of this period's plan · ${formatNumber(planProgress.completed)} of ${formatNumber(planProgress.total)} SEO tasks`
                : `Completed in this period`
            }
          />
          <MetricCard
            tone="amber"
            label="Open tasks"
            value={formatNumber(openTasks)}
            detail={`${formatNumber(taskCounts.inProgress)} in progress · ${formatNumber(taskCounts.todo)} to do`}
          />
          {yearlyPlan ? (
            <MetricCard
              tone="green"
              label="Yearly plan"
              value={formatNumber(yearlyPlan.percent)}
              suffix="%"
              footer={<ProgressBar progress={yearlyPlan} label={`Yearly strategy progress, ${planYear}`} tone="good" />}
              detail={`${formatNumber(yearlyPlan.completed)} of ${formatNumber(yearlyPlan.total)} SEO tasks in ${planYear}`}
            />
          ) : (
            <MetricCard tone="green" label="Yearly plan" value="—" detail={TEAMWORK_DOWN} />
          )}
        </MetricGrid>

        <Panel
          title="Tasks"
          description="Tasks from the SEO plan in Teamwork"
          headingLevel={3}
          actions={
            <>
              <DetailsLink href="/roadmap">View roadmap</DetailsLink>
              <DetailsLink href="/work" about="tasks" />
            </>
          }
        >
          <PanelColumns>
            <PanelBlock
              headingLevel={4}
              title="Tasks over time"
              description="By month · completed and open (to do plus in progress)"
              aside={
                <Legend>
                  <LegendItem color={BAR_BLUE} label="Completed" />
                  <LegendItem color={BAR_LIGHT} label="Open" />
                </Legend>
              }
            >
              {tasksByMonth.every((row) => row.completed + row.open === 0) ? (
                <QuietEmpty>No tasks yet.</QuietEmpty>
              ) : (
                <>
                  <ColumnChart
                    label="Tasks by month, completed plus open"
                    data={tasksByMonth.map((row) => ({
                      label: formatMonthShort(row.month),
                      value: row.completed,
                      extra: row.open,
                    }))}
                  />
                  <table className="sr-only">
                    <caption>Tasks by month</caption>
                    <thead>
                      <tr>
                        <th scope="col">Month</th>
                        <th scope="col">Completed</th>
                        <th scope="col">Open</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasksByMonth.map((row) => (
                        <tr key={row.month}>
                          <th scope="row">{monthLabel(row.month)}</th>
                          <td>{formatNumber(row.completed)}</td>
                          <td>{formatNumber(row.open)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </PanelBlock>
            <PanelBlock headingLevel={4} title="Recently completed" description="Latest tasks finished in this period" className="gap-1.5">
              {recentCompleted.length === 0 ? (
                <QuietEmpty>No tasks were completed in this period.</QuietEmpty>
              ) : (
                <ul className="mt-1">
                  {recentCompleted.map((task) => (
                    <ListRow key={task.id}>
                      <CheckCircle />
                      <span className="flex min-w-0 flex-1 flex-col leading-[1.35]">
                        <span className="truncate text-[13px] font-medium text-ink">
                          <ExternalLink
                            href={task.url}
                            className="text-ink after:absolute after:inset-0 hover:text-primary"
                          >
                            {task.name}
                          </ExternalLink>
                        </span>
                        <span className="truncate text-xs text-ink-quiet">
                          {task.category} · {task.assignee}
                        </span>
                      </span>
                      <span className="flex-none text-xs text-ink-quiet">{formatDate(task.completedDate)}</span>
                    </ListRow>
                  ))}
                </ul>
              )}
            </PanelBlock>
          </PanelColumns>
        </Panel>
      </PageSection>

      <PageSection label="Summary">
        <Panel title="Performance summary" description={periodText} headingLevel={3}>
          <ul className="flex list-disc flex-col gap-1.5 pl-4 text-[13px] text-ink-body marker:text-bar-muted">
            {summary.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Panel>
      </PageSection>
    </div>
  );
}
