import "server-only";
import type {
  AgentSlug,
  AiAgent,
  BrokenLink,
  DeliveryModule,
  MonitoredForm,
  MonthlyReport,
  NotificationPreference,
  ReportStatus,
  SiteIssue,
} from "@/lib/types";
import { ACTIVE_MONTHS } from "@/mocks/calendar";
import {
  aiAgents,
  brokenLinks,
  deliveryModules,
  monitoredForms,
  notificationPreferences,
  siteIssues,
} from "@/mocks/operations";
import { searchMetrics } from "@/mocks/traffic";
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

function reportStatus(index: number): ReportStatus {
  if (index === ACTIVE_MONTHS.length - 1) return "draft";
  if (index === ACTIVE_MONTHS.length - 2) return "ready";
  return "sent";
}

/** Newest first. Lead figures come from `useLeads()`, so they stay current. */
export async function getMonthlyReports(): Promise<MonthlyReport[]> {
  await requireSessionUser();
  return ACTIVE_MONTHS.map((month, index) => {
    const search = searchMetrics.find((row) => row.month === month);
    return {
      id: `report-${month}`,
      month,
      organicClicks: search?.clicks ?? 0,
      impressions: search?.impressions ?? 0,
      averagePosition: search?.position ?? 0,
      status: reportStatus(index),
    };
  }).reverse();
}
