import "server-only";
import type {
  AgentSlug,
  AiAgent,
  BrokenLink,
  DeliveryModule,
  MonitoredForm,
  NotificationPreference,
  SiteIssue,
} from "@/lib/types";
import {
  aiAgents,
  brokenLinks,
  deliveryModules,
  monitoredForms,
  notificationPreferences,
  siteIssues,
} from "@/mocks/operations";
import { requireSessionUser } from "@/server/auth/session";
import { createDb, releaseDb } from "@/server/db/client";
import { mergePreferences } from "@/server/notifications/preferences";

export async function getMonitoredForms(): Promise<MonitoredForm[]> {
  await requireSessionUser();
  return monitoredForms;
}

export async function getBrokenLinks(): Promise<BrokenLink[]> {
  await requireSessionUser();
  return brokenLinks;
}

export async function getSiteIssues(): Promise<SiteIssue[]> {
  await requireSessionUser();
  return siteIssues;
}

export async function getAiAgents(): Promise<AiAgent[]> {
  await requireSessionUser();
  return aiAgents;
}

export async function getAiAgent(slug: string): Promise<AiAgent | null> {
  await requireSessionUser();
  return aiAgents.find((agent) => agent.slug === (slug as AgentSlug)) ?? null;
}

export async function getDeliveryModules(): Promise<DeliveryModule[]> {
  await requireSessionUser();
  return deliveryModules;
}

/** The notification events, with the signed-in person's saved choices applied. */
export async function getNotificationPreferences(): Promise<NotificationPreference[]> {
  const user = await requireSessionUser();
  const db = createDb();
  try {
    const saved = await db.notificationPreference.findMany({
      where: { userId: user.id },
      select: { eventId: true, email: true, inApp: true },
    });
    return mergePreferences(notificationPreferences, saved);
  } finally {
    await releaseDb(db);
  }
}
