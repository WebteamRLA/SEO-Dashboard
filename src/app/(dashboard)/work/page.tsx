import type { Metadata } from "next";
import { Info } from "lucide-react";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { WorkTracker } from "@/features/work/work-tracker";
import { resolveMonth } from "@/lib/data/calendar";
import { getWorkTrackerData } from "@/lib/data/work";
import { countTasks, countTasksByCategory } from "@/lib/domain/progress";
import { formatMonth } from "@/lib/format";

export const metadata: Metadata = { title: "Monthly Work Tracker" };

export default async function WorkPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  const month = await resolveMonth((await searchParams).month);
  const monthLabel = formatMonth(month);

  let data: Awaited<ReturnType<typeof getWorkTrackerData>>;
  try {
    data = await getWorkTrackerData();
  } catch (error) {
    // A Teamwork outage or missing config must not take the whole page down.
    const message = error instanceof Error ? error.message : "Could not load Teamwork data.";
    return (
      <PageBody>
        <PageHeader title="Monthly Work Tracker" description={`Showing ${monthLabel}`} />
        <div className="flex items-start gap-2.5 rounded-lg border border-border bg-card px-3.5 py-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-status-warning" aria-hidden />
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Teamwork is not available right now.</span>{" "}
            {message}
          </p>
        </div>
      </PageBody>
    );
  }

  const monthTasks = data.tasks.filter((task) => task.month === month);
  const rows = monthTasks.map((task) => ({
    ...task,
    assigneeName: data.people[task.assigneeId] ?? "Unassigned",
  }));

  return (
    <PageBody>
      <PageHeader
        title="Monthly Work Tracker"
        description={`Live from Teamwork · Showing ${monthLabel}`}
      />
      <WorkTracker
        key={month}
        monthLabel={monthLabel}
        rows={rows}
        counts={countTasks(monthTasks)}
        byCategory={countTasksByCategory(monthTasks)}
      />
    </PageBody>
  );
}
