import "server-only";
import { requireSessionUser } from "@/server/auth/session";
import type {
  KeywordPerformance,
  LandingPage,
  SearchMetrics,
  TrafficChannel,
  TrafficMetrics,
} from "@/lib/types";
import {
  keywords,
  landingPages,
  searchMetrics,
  trafficChannels,
  trafficMetrics,
} from "@/mocks/traffic";

export async function getSearchMetrics(): Promise<SearchMetrics[]> {
  await requireSessionUser();
  return searchMetrics;
}

export async function getTrafficMetrics(): Promise<TrafficMetrics[]> {
  await requireSessionUser();
  return trafficMetrics;
}

export async function getTrafficChannels(): Promise<TrafficChannel[]> {
  await requireSessionUser();
  return trafficChannels;
}

export async function getLandingPages(): Promise<LandingPage[]> {
  await requireSessionUser();
  return landingPages;
}

export async function getKeywords(): Promise<KeywordPerformance[]> {
  await requireSessionUser();
  return keywords;
}
