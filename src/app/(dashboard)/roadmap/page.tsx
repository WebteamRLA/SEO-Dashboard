import type { Metadata } from "next";
import { Info } from "lucide-react";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { RoadmapView } from "@/features/roadmap/roadmap-view";
import { getToday, resolvePagePeriod } from "@/lib/data/calendar";
import { getWorkTrackerData } from "@/lib/data/work";
import { describePeriod } from "@/lib/date-range";
import { taskInPeriod, yearRange } from "@/lib/domain/progress";
import type { Task } from "@/lib/types";

export const metadata: Metadata = { title: "Strategy Roadmap" };

/** Live Teamwork tasks. An outage empties the page instead of failing it. */
async function loadTasks(): Promise<{ tasks: Task[]; error: string | null }> {
  try {
    return { tasks: (await getWorkTrackerData()).tasks, error: null };
  } catch (error) {
    return { tasks: [], error: error instanceof Error ? error.message : "Could not load Teamwork data." };
  }
}

export default async function RoadmapPage({
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
  const [today, { tasks, error }] = await Promise.all([getToday(), loadTasks()]);
  // Same period and year filters as the Overview's plan figures (taskProgress).
  const year = yearRange(today);

  return (
    <PageBody>
      <PageHeader title="Strategy Roadmap" description={describePeriod(period)} />
      {error ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-border bg-card px-3.5 py-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-status-warning" aria-hidden />
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Teamwork is not available right now, so progress is empty.</span>{" "}
            {error}
          </p>
        </div>
      ) : null}
      <RoadmapView
        key={`${period.range.from}_${period.range.to}`}
        periodLabel={describePeriod(period)}
        year={today.slice(0, 4)}
        periodTasks={tasks.filter((task) => taskInPeriod(task, period.range))}
        yearTasks={tasks.filter((task) => taskInPeriod(task, year))}
      />
    </PageBody>
  );
}
