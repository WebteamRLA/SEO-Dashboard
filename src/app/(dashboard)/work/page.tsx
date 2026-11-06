import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { WorkTracker } from "@/features/work/work-tracker";
import { resolveMonth } from "@/lib/data/calendar";
import { getTeamMembers } from "@/lib/data/team";
import { getTasksForMonth } from "@/lib/data/work";
import { countTasks, countTasksByCategory } from "@/lib/domain/progress";
import { formatMonth } from "@/lib/format";

export const metadata: Metadata = { title: "Monthly Work Tracker" };

export default async function WorkPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  const month = await resolveMonth((await searchParams).month);
  const [tasks, team] = await Promise.all([getTasksForMonth(month), getTeamMembers()]);
  const names = new Map(team.map((member) => [member.id, member.name]));
  const monthLabel = formatMonth(month);

  return (
    <PageBody>
      <PageHeader title="Monthly Work Tracker" description={`Showing ${monthLabel}`} />
      <WorkTracker
        key={month}
        monthLabel={monthLabel}
        rows={tasks.map((task) => ({ ...task, assigneeName: names.get(task.assigneeId) ?? "Unassigned" }))}
        counts={countTasks(tasks)}
        byCategory={countTasksByCategory(tasks)}
      />
    </PageBody>
  );
}
