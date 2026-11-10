import "server-only";
import { cookies } from "next/headers";
import { getWorkTrackerData } from "@/lib/data/work";
import type { AppNotification, ISODate, Lead, Task } from "@/lib/types";
import { notificationPreferences as CATALOG } from "@/mocks/operations";
import { requireSessionUser } from "@/server/auth/session";
import { createDb, releaseDb } from "@/server/db/client";
import { buildNotificationFeed } from "@/server/notifications/feed";
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
export async function getNotificationFeed(leads: readonly Lead[], today: ISODate): Promise<AppNotification[]> {
  const [tasks, cookieStore, showLeads] = await Promise.all([feedTasks(), cookies(), wantsLeadsInApp()]);
  return buildNotificationFeed({
    leads: showLeads ? leads : [],
    tasks,
    today,
    seenAt: parseSeenAt(cookieStore.get(SEEN_COOKIE)?.value),
  });
}
