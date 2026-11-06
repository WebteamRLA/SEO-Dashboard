import type {
  KeywordPerformance,
  LandingPage,
  SearchMetrics,
  TrafficChannel,
  TrafficMetrics,
} from "@/lib/types";
import { ACTIVE_MONTHS } from "./calendar";

const CLICKS = [1840, 1975, 2210, 2290, 2560, 2715, 2840, 2795, 3120, 3385, 610];
const IMPRESSIONS = [62400, 65100, 71800, 73500, 80200, 84300, 87900, 86100, 94800, 101200, 19800];
const POSITIONS = [18.4, 17.9, 16.8, 16.5, 15.2, 14.8, 14.1, 14.3, 13.2, 12.6, 12.4];
const SESSIONS = [5120, 5340, 5980, 6040, 6610, 6890, 7120, 6980, 7640, 8210, 1540];

export const searchMetrics: SearchMetrics[] = ACTIVE_MONTHS.map((month, index) => {
  const clicks = CLICKS[index] ?? 0;
  const impressions = IMPRESSIONS[index] ?? 1;
  return {
    month,
    clicks,
    impressions,
    ctr: Math.round((clicks / impressions) * 1000) / 10,
    position: POSITIONS[index] ?? 0,
  };
});

export const trafficMetrics: TrafficMetrics[] = ACTIVE_MONTHS.map((month, index) => {
  const sessions = SESSIONS[index] ?? 0;
  const organicSessions = Math.round(sessions * (0.46 + index * 0.01));
  return {
    month,
    sessions,
    users: Math.round(sessions * 0.74),
    organicSessions,
    organicVisitors: Math.round(organicSessions * 0.78),
    referralSessions: Math.round(sessions * 0.11),
  };
});

export const trafficChannels: TrafficChannel[] = [
  { channel: "Organic Search", sessions: 4310 },
  { channel: "Direct", sessions: 1720 },
  { channel: "Referral", sessions: 905 },
  { channel: "Paid Search", sessions: 760 },
  { channel: "Social", sessions: 345 },
  { channel: "Email", sessions: 170 },
];

export const landingPages: LandingPage[] = [
  { url: "/services/seo", clicks: 912, impressions: 21400, organicVisitors: 1180 },
  { url: "/blog/how-much-does-seo-cost", clicks: 684, impressions: 18900, organicVisitors: 870 },
  { url: "/blog/local-seo-checklist", clicks: 521, impressions: 15600, organicVisitors: 690 },
  { url: "/services/web-design", clicks: 388, impressions: 12200, organicVisitors: 505 },
  { url: "/services/paid-media", clicks: 241, impressions: 9100, organicVisitors: 322 },
  { url: "/", clicks: 214, impressions: 6300, organicVisitors: 296 },
];

export const keywords: KeywordPerformance[] = [
  { keyword: "seo agency near me", clicks: 412, impressions: 9800, ctr: 4.2, position: 6.4, change: 1.8 },
  { keyword: "how much does seo cost", clicks: 386, impressions: 12100, ctr: 3.2, position: 4.1, change: 0.6 },
  { keyword: "local seo checklist", clicks: 274, impressions: 7400, ctr: 3.7, position: 5.3, change: 2.1 },
  { keyword: "web design agency", clicks: 198, impressions: 11200, ctr: 1.8, position: 11.6, change: -0.9 },
  { keyword: "seo services for small business", clicks: 176, impressions: 6900, ctr: 2.6, position: 8.2, change: 1.2 },
  { keyword: "paid media agency", clicks: 121, impressions: 5300, ctr: 2.3, position: 9.7, change: 0.3 },
  { keyword: "technical seo audit", clicks: 94, impressions: 3800, ctr: 2.5, position: 7.9, change: -0.4 },
  { keyword: "content marketing agency", clicks: 83, impressions: 4600, ctr: 1.8, position: 12.3, change: 0.8 },
];
