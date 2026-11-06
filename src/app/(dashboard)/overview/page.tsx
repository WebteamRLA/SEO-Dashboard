import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { OverviewView } from "@/features/overview/overview-view";
import { getAvailableMonths, getReferenceDate, resolveMonth } from "@/lib/data/calendar";
import { getTeamMembers } from "@/lib/data/team";
import { getRoadmap, getTasks } from "@/lib/data/work";
import { computeRoadmapProgress, countTasks } from "@/lib/domain/progress";
import { formatMonth } from "@/lib/format";
import { toMonthKey } from "@/lib/month";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  const month = await resolveMonth((await searchParams).month);
  const [tasks, roadmap, team, activeMonths, today] = await Promise.all([
    getTasks(),
    getRoadmap(),
    getTeamMembers(),
    getAvailableMonths(),
    getReferenceDate(),
  ]);

  const names = new Map(team.map((member) => [member.id, member.name]));
  const monthTasks = tasks.filter((task) => task.month === month);

  const tasksByMonth = activeMonths.map((key) => {
    const counts = countTasks(tasks.filter((task) => task.month === key));
    return { month: key, completed: counts.completed, open: counts.todo + counts.inProgress };
  });

  const recentCompleted = monthTasks
    .filter((task) => task.status === "completed")
    .sort((a, b) => (b.completedDate ?? "").localeCompare(a.completedDate ?? ""))
    .slice(0, 5)
    .map((task) => ({
      id: task.id,
      name: task.name,
      category: task.category,
      assignee: names.get(task.assigneeId) ?? "Unassigned",
      completedDate: task.completedDate,
    }));

  const monthLabel = formatMonth(month);

  return (
    <PageBody>
      <PageHeader title="Overview" description={`Showing ${monthLabel}`} />
        <OverviewView
          key={month}
          month={month}
          monthLabel={monthLabel}
          months={activeMonths}
          inProgressMonth={toMonthKey(today)}
          taskCounts={countTasks(monthTasks)}
          yearlyPlan={computeRoadmapProgress(roadmap)}
          monthlyPlan={computeRoadmapProgress(roadmap, month)}
          tasksByMonth={tasksByMonth}
          recentCompleted={recentCompleted}
        />
    </PageBody>
  );
}
