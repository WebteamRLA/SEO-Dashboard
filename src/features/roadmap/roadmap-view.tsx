"use client";

import { useState } from "react";
import { CheckCircle2, Circle, ListChecks } from "lucide-react";
import { EmptyState } from "@/components/data/empty-state";
import { MetricCard, MetricGrid } from "@/components/data/metric-card";
import { ProgressBar } from "@/components/data/progress-bar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STATUS_META } from "@/features/work/filter-tasks";
import { countTasks, toProgress } from "@/lib/domain/progress";
import { formatDate, formatMonth, formatNumber } from "@/lib/format";
import type { Progress, Task } from "@/lib/types";
import { filterByStatus, groupByCategory, groupByMonth, monthsOfYear, type StatusFilter } from "./group";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
];

function progressOf(tasks: readonly Task[]): Progress {
  const counts = countTasks(tasks);
  return toProgress(counts.completed, counts.total);
}

function TaskRow({ task }: { task: Task }) {
  const done = task.status === "completed";
  const Icon = done ? CheckCircle2 : Circle;
  return (
    <li className="flex items-start justify-between gap-3 py-2">
      <div className="flex min-w-0 items-start gap-2">
        <Icon className={`mt-0.5 size-4 shrink-0 ${done ? "text-foreground" : "text-muted-foreground"}`} aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-medium">{task.name}</p>
          <p className="text-xs text-muted-foreground">{STATUS_META[task.status].label}</p>
        </div>
      </div>
      <p className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {done ? `Done ${formatDate(task.completedDate)}` : `Due ${formatDate(task.dueDate)}`}
      </p>
    </li>
  );
}

function CategoryGroups({ tasks }: { tasks: Task[] }) {
  return (
    <div className="flex flex-col gap-3">
      {groupByCategory(tasks).map((group) => (
        <div key={group.category}>
          <h4 className="text-xs font-medium text-muted-foreground">{group.category}</h4>
          <ul className="divide-y divide-border">
            {group.tasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/**
 * Plan progress from the SEO tasks in Teamwork. The page passes the tasks that
 * fall in the selected period and in the current year, filtered the same way
 * as the Overview, so the two pages show the same figures.
 */
export function RoadmapView({
  periodLabel,
  year,
  periodTasks,
  yearTasks,
}: {
  periodLabel: string;
  year: string;
  periodTasks: Task[];
  yearTasks: Task[];
}) {
  const [filter, setFilter] = useState<StatusFilter>("all");

  const yearly = progressOf(yearTasks);
  const period = progressOf(periodTasks);
  const selected = filterByStatus(periodTasks, filter);
  const fullYear = groupByMonth(filterByStatus(yearTasks, filter), monthsOfYear(year));

  return (
    <>
      <MetricGrid>
        <MetricCard
          label="Yearly strategy progress"
          value={`${yearly.percent}%`}
          detail={`${formatNumber(yearly.completed)} of ${formatNumber(yearly.total)} SEO tasks done in ${year}`}
          footer={<ProgressBar progress={yearly} label="Yearly strategy progress" />}
        />
        <MetricCard
          label="Plan progress"
          value={`${period.percent}%`}
          detail={`${formatNumber(period.completed)} of ${formatNumber(period.total)} SEO tasks done in this period`}
          footer={<ProgressBar progress={period} label="Plan progress" />}
        />
        <MetricCard
          label="Completed tasks"
          value={formatNumber(yearly.completed)}
          detail={`Across ${year}`}
          icon={CheckCircle2}
        />
        <MetricCard
          label="Pending tasks"
          value={formatNumber(yearly.total - yearly.completed)}
          detail={`Across ${year}, to do or in progress`}
          icon={Circle}
        />
      </MetricGrid>

      <p className="text-xs text-muted-foreground">
        Progress is the share of SEO tasks in Teamwork that are completed. A completed task counts in the period it was
        completed, an open task in the period it is due. These are the same figures as on the Overview.
      </p>

      <Tabs defaultValue="period" className="gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="period">Selected period</TabsTrigger>
            <TabsTrigger value="year">Full year</TabsTrigger>
          </TabsList>
          <div role="group" aria-label="Filter by status" className="inline-flex gap-1">
            {FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={filter === option.value}
                onClick={() => setFilter(option.value)}
                className="h-8 rounded-md border border-border bg-card px-3 text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-foreground/40 aria-pressed:text-foreground"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <TabsContent value="period">
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">{periodLabel}</h2>
            {selected.length === 0 ? (
              <EmptyState
                icon={ListChecks}
                title="No SEO tasks"
                description={filter === "all" ? "No SEO tasks fall in this period." : "No tasks match this filter."}
              />
            ) : (
              <CategoryGroups tasks={selected} />
            )}
          </section>
        </TabsContent>

        <TabsContent value="year">
          <div className="flex flex-col gap-3">
            {fullYear.map((group) => {
              const progress = progressOf(yearTasks.filter((task) => task.month === group.month));
              return (
                <section key={group.month} className="rounded-lg border border-border bg-card p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold">{formatMonth(group.month)}</h2>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {progress.total === 0
                        ? "No SEO tasks"
                        : `${progress.completed} of ${progress.total} tasks done (${progress.percent}%)`}
                    </p>
                  </div>
                  {progress.total > 0 ? (
                    <ProgressBar progress={progress} label={`${formatMonth(group.month)} progress`} className="mb-3" />
                  ) : null}
                  {group.tasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {progress.total === 0 ? "No SEO tasks this month." : "No tasks match this filter."}
                    </p>
                  ) : (
                    <CategoryGroups tasks={group.tasks} />
                  )}
                </section>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
