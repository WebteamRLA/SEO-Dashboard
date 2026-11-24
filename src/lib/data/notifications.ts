import "server-only";
import { cookies } from "next/headers";
import { getWorkTrackerData } from "@/lib/data/work";
import { getRecentLeads } from "@/lib/data/leads";
import type { AppNotification, ISODate, Lead, Task } from "@/lib/types";
import { notificationPreferences as CATALOG } from "@/mocks/operations";
import { requireSessionUser } from "@/server/auth/session";
import { createDb, releaseDb } from "@/server/db/client";
import { buildNotificationFeed, LEAD_WINDOW_DAYS } from "@/server/notifications/feed";
import { NEW_LEAD_EVENT, wants } from "@/server/notifications/preferences";
import { parseSeenAt, SEEN_COOKIE } from "@/server/notifications/seen";

/** SEO tasks for the feed. Teamwork being down or unset only drops task items. */
async function feedTasks(): Promise<Task[]> {
  try {
    return (await getWorkTrackerData()).tasks;
  } catch (error) {
    console.warn("Notifications: Teamwork tasks unavailable", error instanceof Error ? error.message : error);
    return [];
  }
}

/** Leads recent enough for the feed. A database hiccup only drops lead items. */
async function feedLeads(today: ISODate): Promise<Lead[]> {
  try {
    return await getRecentLeads(today, LEAD_WINDOW_DAYS);
  } catch (error) {
    console.warn("Notifications: recent leads unavailable", error instanceof Error ? error.message : error);
    return [];
  }
}

/** Whether the signed-in person wants new leads in the bell. On unless they turned it off. */
async function wantsLeadsInApp(): Promise<boolean> {
  const user = await requireSessionUser();
  const db = createDb();
  try {
    const saved = await db.notificationPreference.findMany({
      where: { userId: user.id, eventId: NEW_LEAD_EVENT },
      select: { eventId: true, email: true, inApp: true },
    });
    return wants(CATALOG, saved, NEW_LEAD_EVENT, "inApp");
  } catch {
    return true;
  } finally {
    await releaseDb(db);
  }
}

/** The topbar feed: recent leads (unless turned off in settings) plus SEO tasks completed or overdue. */
export async function getNotificationFeed(today: ISODate): Promise<AppNotification[]> {
  // All in parallel: the leads query is small, so it runs even when the person turned lead items off.
  const [tasks, cookieStore, showLeads, recentLeads] = await Promise.all([
    feedTasks(),
    cookies(),
    wantsLeadsInApp(),
    feedLeads(today),
  ]);
  return buildNotificationFeed({
    leads: showLeads ? recentLeads : [],
    tasks,
    today,
    seenAt: parseSeenAt(cookieStore.get(SEEN_COOKIE)?.value),
  });
}
