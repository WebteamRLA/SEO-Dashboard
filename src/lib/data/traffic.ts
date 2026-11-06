import "server-only";
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
  return searchMetrics;
}

export async function getTrafficMetrics(): Promise<TrafficMetrics[]> {
  return trafficMetrics;
}

export async function getTrafficChannels(): Promise<TrafficChannel[]> {
  return trafficChannels;
}

export async function getLandingPages(): Promise<LandingPage[]> {
  return landingPages;
}

export async function getKeywords(): Promise<KeywordPerformance[]> {
  return keywords;
}
