import type { MonthKey } from "./common";

export interface SearchMetrics {
  month: MonthKey;
  clicks: number;
  impressions: number;
  /** Percent, e.g. 3.4. */
  ctr: number;
  position: number;
}

export interface TrafficMetrics {
  month: MonthKey;
  sessions: number;
  users: number;
  organicSessions: number;
  organicVisitors: number;
  referralSessions: number;
}

export interface TrafficChannel {
  channel: string;
  sessions: number;
}

export interface LandingPage {
  url: string;
  clicks: number;
  impressions: number;
  organicVisitors: number;
}

export interface KeywordPerformance {
  keyword: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  /** Positive means the position improved versus the prior month. */
  change: number;
}
