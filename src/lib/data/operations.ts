import "server-only";
import type {
  AgentSlug,
  AiAgent,
  AppNotification,
  BrokenLink,
  DeliveryModule,
  FormConnection,
  Integration,
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
  formConnections,
  integrations,
  monitoredForms,
  notificationPreferences,
  notifications,
  siteIssues,
} from "@/mocks/operations";
import { searchMetrics } from "@/mocks/traffic";

export async function getMonitoredForms(): Promise<MonitoredForm[]> {
  return monitoredForms;
}

export async function getBrokenLinks(): Promise<BrokenLink[]> {
  return brokenLinks;
}

export async function getSiteIssues(): Promise<SiteIssue[]> {
  return siteIssues;
}

export async function getAiAgents(): Promise<AiAgent[]> {
  return aiAgents;
}

export async function getAiAgent(slug: string): Promise<AiAgent | null> {
  return aiAgents.find((agent) => agent.slug === (slug as AgentSlug)) ?? null;
}

export async function getDeliveryModules(): Promise<DeliveryModule[]> {
  return deliveryModules;
}

export async function getIntegrations(): Promise<Integration[]> {
  return integrations;
}

export async function getFormConnections(): Promise<FormConnection[]> {
  return formConnections;
}

export async function getNotificationPreferences(): Promise<NotificationPreference[]> {
  return notificationPreferences;
}

export async function getNotifications(): Promise<AppNotification[]> {
  return notifications;
}

function reportStatus(index: number): ReportStatus {
  if (index === ACTIVE_MONTHS.length - 1) return "draft";
  if (index === ACTIVE_MONTHS.length - 2) return "ready";
  return "sent";
}

/** Newest first. Lead figures come from `useLeads()`, so they stay current. */
export async function getMonthlyReports(): Promise<MonthlyReport[]> {
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
