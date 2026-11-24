import type { Metadata } from "next";
import { Info } from "lucide-react";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { WorkTracker } from "@/features/work/work-tracker";
import { resolvePagePeriod } from "@/lib/data/calendar";
import { describePeriod } from "@/lib/date-range";
import { getWorkTrackerData } from "@/lib/data/work";
import { countTasks, countTasksByCategory, taskInPeriod } from "@/lib/domain/progress";

export const metadata: Metadata = { title: "Monthly Work Tracker" };

export default async function WorkPage({
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
  const periodText = describePeriod(period);

  let data: Awaited<ReturnType<typeof getWorkTrackerData>>;
  try {
    data = await getWorkTrackerData();
  } catch (error) {
    // A Teamwork outage or missing config must not take the whole page down.
    const message = error instanceof Error ? error.message : "Could not load Teamwork data.";
    return (
      <PageBody>
        <PageHeader title="Monthly Work Tracker" description={`Live from Teamwork · ${periodText}`} />
        <div className="flex items-start gap-2.5 rounded-xl border border-[var(--tile-amber)] bg-[#fffbeb] px-4 py-3 text-[13px]">
          <Info className="mt-0.5 size-4 shrink-0 text-status-warning" aria-hidden />
          <p className="text-ink-body">
            <span className="font-semibold text-ink">Teamwork is not available right now.</span>{" "}
            {message}
          </p>
        </div>
      </PageBody>
    );
  }

  const periodTasks = data.tasks.filter((task) => taskInPeriod(task, period.range));
  const rows = periodTasks.map((task) => ({
    ...task,
    assigneeName: data.people[task.assigneeId] ?? "Unassigned",
  }));

  return (
    <PageBody>
      <PageHeader
        title="Monthly Work Tracker"
        description={`Live from Teamwork · ${periodText}`}
      />
      <WorkTracker
        key={`${period.range.from}_${period.range.to}`}
        periodText={periodText}
        rows={rows}
        counts={countTasks(periodTasks)}
        byCategory={countTasksByCategory(periodTasks)}
      />
    </PageBody>
  );
}
