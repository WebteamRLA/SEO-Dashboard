"use client";

import { ChevronDown, Target } from "lucide-react";
import { EmptyState } from "@/components/data/empty-state";
import { ExternalLink } from "@/components/data/external-link";
import { MetricCard, MetricGrid } from "@/components/data/metric-card";
import { Panel, Legend, LegendItem } from "@/components/data/panel";
import { StatusBadge, Tag } from "@/components/data/status-badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { goalAchievement, groupStrategies, reviewState, summarizeStrategies } from "@/lib/domain/strategy";
import { formatDate, formatMonthShort, formatNumber } from "@/lib/format";
import type { StatusTone, Strategy } from "@/lib/types";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const GREEN = "#16A34A";
const BLUE = "#0091FF";
const GREY = "#D1D5DB";
const AMBER = "#F59E0B";

function statusTone(status: string): StatusTone {
  const value = status.trim().toLowerCase();
  if (value === "completed" || value === "done") return "good";
  if (value === "in progress") return "info";
  if (value === "blocked" || value === "at risk") return "critical";
  return "neutral";
}

type BarKind = "done" | "active" | "planned" | "other";

/** Same classification as summarizeStrategies, so bars and tiles agree. */
function barKind(status: string): BarKind {
  const value = status.trim().toLowerCase();
  if (value === "completed" || value === "done") return "done";
  if (value === "in progress") return "active";
  if (value === "planned") return "planned";
  return "other";
}

/** A labelled meter; the bar caps at 100% while the label shows the real figure. */
function Meter({ label, percent, tone = "info" }: { label: string; percent: number; tone?: "info" | "good" }) {
  const width = Math.min(100, Math.max(0, percent));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={width}
      className="h-1.5 w-full overflow-hidden rounded-[3px] bg-line"
    >
      <div className={cn("h-full rounded-[3px]", tone === "good" ? "bg-status-good" : "bg-bar")} style={{ width: `${width}%` }} />
    </div>
  );
}

// ---- Timeline -------------------------------------------------------------

/** Position of a date within a year as 0..1; dates outside the year clamp to 0 or 1. */
function yearFraction(date: string, year: number): number {
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  const time = Date.parse(`${date}T00:00:00Z`);
  return Math.min(1, Math.max(0, (time - start) / (end - start)));
}

function Timeline({ strategies, today }: { strategies: Strategy[]; today: string }) {
  const year = Number(today.slice(0, 4));
  const rows = [...strategies].sort((a, b) => a.sortOrder - b.sortOrder);
  const currentMonth = Number(today.slice(5, 7)) - 1;
  const todayPct = yearFraction(today, year) * 100;

  return (
    <Panel
      id="timeline"
      title={`${year} timeline`}
      description="Each bar runs from a strategy's start to end date; the filled part shows work done"
      actions={
        <Legend>
          <LegendItem color={GREEN} label="Done" />
          <LegendItem color={BLUE} label="In progress" />
          <LegendItem color={GREY} label="Planned" />
          {rows.some((strategy) => barKind(strategy.status) === "other") ? (
            <LegendItem color={AMBER} label="Other status" />
          ) : null}
        </Legend>
      }
    >
      <div className="overflow-x-auto">
        <div className="min-w-[720px] pb-9">
          <div className="flex h-7 items-center">
            <span className="w-[220px] flex-none" />
            <div className="flex flex-1">
              {MONTHS.map((month, index) => (
                <span
                  key={month}
                  className={cn("min-w-0 flex-1 text-center text-xs font-medium", index === currentMonth ? "text-primary" : "text-ink-quiet")}
                >
                  {month}
                </span>
              ))}
            </div>
          </div>
          <div className="flex">
            <div className="flex w-[220px] flex-none flex-col">
              {rows.map((strategy) => (
                <div key={strategy.id} className="flex h-12 flex-col justify-center border-t border-line-soft pr-3 leading-[1.3]">
                  <span className="truncate text-[13px] font-semibold text-ink" title={strategy.initiative}>
                    {strategy.initiative}
                  </span>
                  <span className="text-xs text-ink-quiet tabular-nums">
                    {strategy.workProgress === null ? "Work not reported" : `${strategy.workProgress}% work done`}
                  </span>
                </div>
              ))}
            </div>
            <div className="relative min-w-0 flex-1">
              <div aria-hidden className="absolute inset-0 flex">
                {MONTHS.map((month, index) => (
                  <div key={month} className={cn("flex-1 border-l", index === 0 ? "border-transparent" : "border-line-soft")} />
                ))}
              </div>
              <div className="relative flex flex-col">
                {rows.map((strategy) => {
                  const hasBar = strategy.startDate && strategy.endDate && strategy.endDate >= strategy.startDate;
                  const kind = barKind(strategy.status);
                  const left = hasBar ? yearFraction(strategy.startDate!, year) * 100 : 0;
                  const right = hasBar ? yearFraction(strategy.endDate!, year) * 100 : 0;
                  const visible = hasBar && right > left;
                  const progress = kind === "done" ? 100 : Math.min(100, Math.max(0, strategy.workProgress ?? 0));
                  const label = `${strategy.initiative}: ${strategy.status}${
                    strategy.workProgress === null ? "" : `, ${strategy.workProgress}% work done`
                  }${hasBar ? `, ${formatDate(strategy.startDate)} to ${formatDate(strategy.endDate)}` : ", no dates in the sheet"}`;
                  return (
                    <div key={strategy.id} className="relative h-12 border-t border-line-soft">
                      {visible ? (
                        <div
                          role="img"
                          aria-label={label}
                          className="absolute top-[14px] h-5 overflow-hidden rounded-[5px]"
                          style={{
                            left: `${left}%`,
                            width: `${right - left}%`,
                            background: kind === "planned" ? GREY : kind === "done" ? GREEN : kind === "other" ? AMBER : "var(--bar-light)",
                          }}
                        >
                          {kind === "active" ? <div className="h-full bg-bar" style={{ width: `${progress}%` }} /> : null}
                        </div>
                      ) : (
                        <span className="sr-only">{label}</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div aria-hidden className="absolute -top-0 bottom-0 w-px bg-ink" style={{ left: `${todayPct}%` }}>
                <span className="absolute -bottom-6 left-1/2 h-[18px] -translate-x-1/2 rounded bg-ink px-1.5 text-[11px] leading-[18px] font-semibold whitespace-nowrap text-white">
                  Today
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

// ---- Initiatives table ----------------------------------------------------

function monthsRange(strategy: Strategy): string {
  if (!strategy.startDate) return "—";
  const start = formatMonthShort(strategy.startDate.slice(0, 7));
  if (!strategy.endDate) return `From ${start}`;
  const sameYear = strategy.startDate.slice(0, 4) === strategy.endDate.slice(0, 4);
  const end = formatMonthShort(strategy.endDate.slice(0, 7));
  const tail = sameYear ? "" : ` ${strategy.endDate.slice(0, 4)}`;
  return start === end && sameYear ? start : `${start} – ${end}${tail}`;
}

function Detail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-semibold text-ink">{label}</dt>
      <dd className="text-[13px] whitespace-pre-line text-ink-quiet">{value}</dd>
    </div>
  );
}

function GoalCell({ strategy }: { strategy: Strategy }) {
  if (!strategy.kpiTarget) return <span className="text-ink-quiet">No goal set</span>;
  const achieved = goalAchievement(strategy.kpiTarget, strategy.kpiCurrent);
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[13px] text-ink-body">
        <span className="font-medium">{strategy.kpiCurrent ?? "—"}</span>
        <span className="text-ink-quiet"> of {strategy.kpiTarget}</span>
      </p>
      {achieved === null ? (
        <p className="text-xs text-ink-quiet">{strategy.kpiCurrent ? "No number to compare" : "Nothing recorded yet"}</p>
      ) : (
        <>
          <Meter label={`${strategy.initiative}: goal achieved`} percent={achieved} tone={achieved >= 100 ? "good" : "info"} />
          <p className={cn("text-xs tabular-nums", achieved >= 100 ? "font-medium text-tone-good-fg" : "text-ink-quiet")}>
            {formatNumber(achieved)}% achieved
          </p>
        </>
      )}
    </div>
  );
}

function InitiativeRow({ strategy, today }: { strategy: Strategy; today: string }) {
  const review = reviewState(strategy.nextReview, today);
  const hasDetails = [strategy.workCompleted, strategy.nextSteps, strategy.outcome, strategy.expectedImpact, strategy.timeToImpact].some(Boolean);
  const kind = barKind(strategy.status);
  return (
    <tr className="border-t border-line-soft align-top">
      <td className="min-w-[280px] px-5 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-ink">{strategy.initiative}</span>
          {strategy.action ? <span className="text-[13px] whitespace-pre-line text-ink-quiet">{strategy.action}</span> : null}
        </div>
        {hasDetails || strategy.evidenceUrl || strategy.taskUrl ? (
          <Collapsible className="mt-2 flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] font-medium">
              {strategy.taskUrl ? <ExternalLink href={strategy.taskUrl}>View tasks</ExternalLink> : null}
              {strategy.evidenceUrl ? <ExternalLink href={strategy.evidenceUrl}>Evidence</ExternalLink> : null}
              {hasDetails ? (
                <CollapsibleTrigger className="group inline-flex items-center gap-1 text-primary hover:underline">
                  Details
                  <ChevronDown className="size-3.5 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
                </CollapsibleTrigger>
              ) : null}
            </div>
            {hasDetails ? (
              <CollapsibleContent>
                <dl className="flex flex-col gap-2 rounded-lg bg-surface-subtle p-3">
                  <Detail label="Work completed" value={strategy.workCompleted} />
                  <Detail label="Next steps" value={strategy.nextSteps} />
                  <Detail label="Outcome so far" value={strategy.outcome} />
                  <Detail label="Expected impact" value={strategy.expectedImpact} />
                  <Detail label="Time to impact" value={strategy.timeToImpact} />
                </dl>
              </CollapsibleContent>
            ) : null}
          </Collapsible>
        ) : null}
      </td>
      <td className="px-5 py-3">
        <StatusBadge tone={statusTone(strategy.status)} label={strategy.status} />
      </td>
      <td className="min-w-[160px] px-5 py-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] text-ink-body tabular-nums">
            {strategy.workProgress === null ? "Not reported" : `${strategy.workProgress}% done`}
          </span>
          {strategy.workProgress !== null ? (
            <Meter label={`${strategy.initiative}: work done`} percent={strategy.workProgress} tone={kind === "done" ? "good" : "info"} />
          ) : null}
        </div>
      </td>
      <td className="min-w-[170px] px-5 py-3">
        <GoalCell strategy={strategy} />
      </td>
      <td className="px-5 py-3 text-[13px] whitespace-nowrap text-ink-body">
        {monthsRange(strategy)}
        {strategy.duration ? <span className="block text-xs text-ink-quiet">{strategy.duration}</span> : null}
      </td>
      <td className="px-5 py-3 text-[13px] text-ink-body">
        {strategy.owner ? <span className="block">{strategy.owner}</span> : null}
        {strategy.nextReview ? (
          <span className={cn("block text-xs whitespace-nowrap", review === "overdue" ? "font-medium text-tone-critical-fg" : "text-ink-quiet")}>
            Review {formatDate(strategy.nextReview)}
            {review === "overdue" ? " (overdue)" : ""}
          </span>
        ) : null}
        {!strategy.owner && !strategy.nextReview ? <span className="text-ink-quiet">—</span> : null}
      </td>
    </tr>
  );
}

const TH = "h-10 px-5 text-left text-xs font-medium text-ink-quiet whitespace-nowrap";

export function StrategyRoadmap({ strategies, today, lastImport }: { strategies: Strategy[]; today: string; lastImport?: string | null }) {
  if (strategies.length === 0) {
    return (
      <EmptyState
        icon={Target}
        title="No strategies imported yet"
        description="No strategies have been imported yet. The SEO team adds them from the strategy sheet."
      />
    );
  }
  const summary = summarizeStrategies(strategies);
  const overdue = strategies.filter((strategy) => reviewState(strategy.nextReview, today) === "overdue").length;

  return (
    <>
      <MetricGrid>
        <MetricCard
          tone="green"
          label="Work done (average)"
          value={summary.averageWork === null ? "—" : summary.averageWork}
          suffix={summary.averageWork === null ? undefined : "%"}
          footer={
            summary.averageWork === null ? undefined : (
              <Meter label="Average work done" percent={summary.averageWork} tone="good" />
            )
          }
          detail="Across strategies that report it"
        />
        <MetricCard
          tone="blue"
          label="Strategies"
          value={formatNumber(summary.completed)}
          suffix={`/${formatNumber(summary.total)} done`}
          detail={`${formatNumber(summary.inProgress)} in progress, ${formatNumber(summary.planned)} planned`}
        />
        <MetricCard
          label="Goal achieved (average)"
          value={summary.averageAchievement === null ? "—" : summary.averageAchievement}
          suffix={summary.averageAchievement === null ? undefined : "%"}
          detail={`${formatNumber(summary.measured)} strategies have a goal and value`}
        />
        <MetricCard
          tone="amber"
          label="Reviews overdue"
          value={formatNumber(overdue)}
          detail="Next review date has passed"
        />
      </MetricGrid>

      <Timeline strategies={strategies} today={today} />

      <Panel
        flush
        id="initiatives"
        title="Initiatives"
        description={`From the RLA SEO strategy sheet${lastImport ? `, updated ${formatDate(lastImport)}` : ""}. Achieved is the current value divided by the monthly goal; a range such as 40–50 counts from its lower end. Work done is the team's own estimate.`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <caption className="sr-only">SEO strategies by priority and goal</caption>
            <thead className="bg-surface-subtle">
              <tr className="border-y border-line">
                <th scope="col" className={TH}>Initiative</th>
                <th scope="col" className={TH}>Status</th>
                <th scope="col" className={TH}>Work done</th>
                <th scope="col" className={TH}>Monthly goal</th>
                <th scope="col" className={TH}>Months</th>
                <th scope="col" className={TH}>Owner and review</th>
              </tr>
            </thead>
            {groupStrategies(strategies).flatMap((group) =>
              group.goals.map((goal) => (
                <tbody key={`${group.priority}/${goal.goalType}`}>
                  <tr className="border-t border-line bg-surface-subtle">
                    <th colSpan={6} scope="rowgroup" className="h-9 px-5 text-left">
                      <span className="text-xs font-semibold tracking-[0.04em] text-ink-body uppercase">
                        {group.priority} goals
                      </span>
                      <Tag className="mx-2 align-middle">{goal.goalType}</Tag>
                      <span className="text-xs font-normal text-ink-quiet tabular-nums">{goal.items.length}</span>
                    </th>
                  </tr>
                  {goal.items.map((strategy) => (
                    <InitiativeRow key={strategy.id} strategy={strategy} today={today} />
                  ))}
                </tbody>
              )),
            )}
          </table>
        </div>
      </Panel>
    </>
  );
}
