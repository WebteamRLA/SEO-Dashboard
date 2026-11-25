import type { Metadata } from "next";
import { Info } from "lucide-react";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { OverviewView } from "@/features/overview/overview-view";
import { getToday, resolvePagePeriod } from "@/lib/data/calendar";
import { getWorkTrackerData, type WorkTrackerData } from "@/lib/data/work";
import { describePeriod } from "@/lib/date-range";
import { countTasks, taskInPeriod, taskProgress, yearRange } from "@/lib/domain/progress";
import { periodBuckets } from "@/lib/period-buckets";


export const metadata: Metadata = { title: "Overview" };

/** Live Teamwork tasks. An outage empties the task panels instead of failing the page. */
async function loadWork(): Promise<WorkTrackerData & { error: string | null }> {
  try {
    return { ...(await getWorkTrackerData()), error: null };
  } catch (error) {
    return { tasks: [], people: {}, error: error instanceof Error ? error.message : "Could not load Teamwork data." };
  }
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string | string[];
    from?: string | string[];
    to?: string | string[];
    month?: string | string[];
  }>;
}) {
  const period = await resolvePagePeriod(await searchParams);
  const { range } = period;
  const today = await getToday();
  const work = await loadWork();
  const { tasks, people } = work;

  const periodTasks = tasks.filter((task) => taskInPeriod(task, range));
  const periodCounts = countTasks(periodTasks);

  // Plan progress comes from the SEO tasks in Teamwork, computed exactly as the
  // Strategy Roadmap page does. Null only when Teamwork is down.
  const year = today.slice(0, 4);
  const planProgress = work.error ? null : taskProgress(tasks, range);
  const yearlyPlan = work.error ? null : taskProgress(tasks, yearRange(today));

  // The whole period is drawn, since open tasks can be due later in it. A task
  // sits in the column of its completion day, or its due day while open.
  const { unit, buckets } = periodBuckets(range, today);
  const tasksTrend = {
    unit,
    rows: buckets.map((bucket) => {
      const counts = countTasks(periodTasks.filter((task) => taskInPeriod(task, bucket.range)));
      return {
        label: bucket.label,
        completed: counts.completed,
        open: counts.todo + counts.inProgress,
        partial: bucket.partial,
      };
    }),
  };

  const recentCompleted = periodTasks
    .filter((task) => task.status === "completed")
    .sort((a, b) => (b.completedDate ?? "").localeCompare(a.completedDate ?? ""))
    .slice(0, 5)
    .map((task) => ({
      id: task.id,
      name: task.name,
      category: task.category,
      assignee: people[task.assigneeId] ?? "Unassigned",
      completedDate: task.completedDate,
      url: task.url,
    }));


  return (
    <PageBody>
      <PageHeader title="Overview" description={describePeriod(period)} />
      {work.error ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-card px-5 py-3.5 text-[13px]">
          <Info className="mt-0.5 size-4 shrink-0 text-status-warning" aria-hidden />
          <p className="text-ink-quiet">
            <span className="font-medium text-ink">Teamwork is not available right now, so task figures are empty.</span>{" "}
            {work.error}
          </p>
        </div>
      ) : null}
      <OverviewView
        key={`${range.from}_${range.to}`}
        range={range}
        periodText={describePeriod(period)}
        today={today}
        taskCounts={periodCounts}
        planYear={year}
        yearlyPlan={yearlyPlan}
        planProgress={planProgress}
        tasksTrend={tasksTrend}
        recentCompleted={recentCompleted}
      />
    </PageBody>
  );
}
