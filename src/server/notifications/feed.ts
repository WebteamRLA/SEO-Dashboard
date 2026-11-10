import { addDays, isWithin } from "@/lib/date-range";
import { formatDate } from "@/lib/format";
import type { AppNotification, ISODate, ISODateTime, Lead, Task } from "@/lib/types";

/**
 * The notification feed, built from real data on each request: new leads, and
 * SEO tasks completed or overdue in Teamwork. Pure, so the rules are tested
 * without a database or Teamwork. Nothing is shown that has no live source.
 */

export const LEAD_WINDOW_DAYS = 14;
export const TASK_WINDOW_DAYS = 7;
const PER_KIND = 5;
export const MAX_ITEMS = 8;

type FeedItem = Omit<AppNotification, "read">;

const startOfDay = (date: ISODate): ISODateTime => `${date}T00:00:00.000Z`;

function leadItems(leads: readonly Lead[], today: ISODate): FeedItem[] {
  const window = { from: addDays(today, -(LEAD_WINDOW_DAYS - 1)), to: today };
  return leads
    .flatMap((lead) =>
      lead.stage !== "spam" && lead.submittedAt && isWithin(lead.submittedAt, window)
        ? [{ lead, at: lead.submittedAt }]
        : [],
    )
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, PER_KIND)
    .map(({ lead, at }) => ({
      id: `lead-${lead.id}`,
      kind: "lead" as const,
      title: `New lead: ${lead.name}`,
      description: [lead.attribution.source, lead.formName].filter(Boolean).join(" · "),
      createdAt: at,
      href: `/leads/${lead.id}`,
    }));
}

function completedItems(tasks: readonly Task[], today: ISODate): FeedItem[] {
  const window = { from: addDays(today, -(TASK_WINDOW_DAYS - 1)), to: today };
  return tasks
    .flatMap((task) =>
      task.status === "completed" && task.completedDate && isWithin(task.completedDate, window)
        ? [{ task, at: task.completedAt ?? startOfDay(task.completedDate) }]
        : [],
    )
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, PER_KIND)
    .map(({ task, at }) => ({
      id: `done-${task.id}`,
      kind: "task-completed" as const,
      title: "SEO task completed",
      description: task.name,
      createdAt: at,
      href: "/work",
    }));
}

function overdueItems(tasks: readonly Task[], today: ISODate): FeedItem[] {
  return tasks
    .filter((task) => task.status !== "completed" && task.dueDate !== "" && task.dueDate < today)
    // Most recently overdue first; it became overdue the day after it was due.
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
    .slice(0, PER_KIND)
    .map((task) => ({
      id: `overdue-${task.id}`,
      kind: "task-overdue" as const,
      title: "SEO task overdue",
      description: `${task.name} · was due ${formatDate(task.dueDate)}`,
      createdAt: startOfDay(addDays(task.dueDate, 1)),
      href: "/work",
    }));
}

export function buildNotificationFeed(input: {
  leads: readonly Lead[];
  tasks: readonly Task[];
  today: ISODate;
  /** When this browser last opened the menu; null if never. */
  seenAt: ISODateTime | null;
}): AppNotification[] {
  const { leads, tasks, today, seenAt } = input;
  const seen = seenAt === null ? null : Date.parse(seenAt);
  return [...leadItems(leads, today), ...completedItems(tasks, today), ...overdueItems(tasks, today)]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, MAX_ITEMS)
    .map((item) => ({ ...item, read: seen !== null && Date.parse(item.createdAt) <= seen }));
}
