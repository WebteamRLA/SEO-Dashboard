import type { SpeedResult, Vital, VitalCategory } from "./types";

/**
 * Mobile speed from Google PageSpeed Insights: the Lighthouse performance score
 * for the home page, and Core Web Vitals from real Chrome visitors (the Chrome
 * UX Report) for the whole site. Parsing is pure and tested.
 */

/** Google's published Core Web Vitals thresholds: [good up to, poor above]. */
export const VITAL_THRESHOLDS = {
  lcp: [2500, 4000],
  inp: [200, 500],
  cls: [0.1, 0.25],
} as const;

export function vitalCategory(metric: keyof typeof VITAL_THRESHOLDS, value: number): VitalCategory {
  const [good, poor] = VITAL_THRESHOLDS[metric];
  if (value <= good) return "good";
  return value <= poor ? "needs-improvement" : "poor";
}

interface FieldMetric {
  percentile?: number;
}
interface LoadingExperience {
  metrics?: Record<string, FieldMetric | undefined>;
  origin_fallback?: boolean;
}
interface PsiResponse {
  id?: string;
  loadingExperience?: LoadingExperience;
  originLoadingExperience?: LoadingExperience;
  lighthouseResult?: {
    finalUrl?: string;
    categories?: { performance?: { score?: number | null } };
    audits?: Record<string, { numericValue?: number } | undefined>;
  };
}

function vital(metric: keyof typeof VITAL_THRESHOLDS, value: number | undefined): Vital | null {
  if (value === undefined || !Number.isFinite(value)) return null;
  return { value, category: vitalCategory(metric, value) };
}

function fieldVitals(experience: LoadingExperience | undefined) {
  const metrics = experience?.metrics;
  if (!metrics) return null;
  const lcp = vital("lcp", metrics.LARGEST_CONTENTFUL_PAINT_MS?.percentile);
  const inp = vital("inp", metrics.INTERACTION_TO_NEXT_PAINT?.percentile);
  // The field CLS percentile comes multiplied by 100 (5 means 0.05).
  const rawCls = metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile;
  const cls = vital("cls", rawCls === undefined ? undefined : rawCls / 100);
  return lcp || inp || cls ? { lcp, inp, cls } : null;
}

export function parsePageSpeed(body: unknown): SpeedResult {
  const psi = (body ?? {}) as PsiResponse;
  const lighthouse = psi.lighthouseResult;
  const score = lighthouse?.categories?.performance?.score;
  if (typeof score !== "number") throw new Error("PageSpeed Insights returned no performance score.");

  // Whole-site data is steadier than one page's; fall back to the page only when the site has none.
  const origin = fieldVitals(psi.originLoadingExperience);
  const page = psi.loadingExperience?.origin_fallback ? null : fieldVitals(psi.loadingExperience);
  const field = origin ? { scope: "origin" as const, ...origin } : page ? { scope: "page" as const, ...page } : null;

  return {
    url: lighthouse?.finalUrl ?? psi.id ?? "",
    score: Math.round(score * 100),
    field,
    lab: {
      lcp: vital("lcp", lighthouse?.audits?.["largest-contentful-paint"]?.numericValue),
      cls: vital("cls", lighthouse?.audits?.["cumulative-layout-shift"]?.numericValue),
    },
  };
}

export function pageSpeedUrl(pageUrl: string, apiKey: string): string {
  const params = new URLSearchParams({ url: pageUrl, strategy: "mobile", category: "performance", key: apiKey });
  return `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`;
}

/** One mobile test of `pageUrl`. Lighthouse runs on Google's side and can take up to a minute. */
export async function fetchPageSpeed(pageUrl: string, apiKey: string, timeoutMs = 120_000): Promise<SpeedResult> {
  let response: Response;
  try {
    response = await fetch(pageSpeedUrl(pageUrl, apiKey), { signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
  } catch {
    // The request URL carries the API key, so never pass the fetch error (which may quote it) along.
    throw new Error("PageSpeed Insights did not respond in time.");
  }
  const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
  if (!response.ok) {
    const message = body?.error?.message ?? `status ${response.status}`;
    if (/API key not valid|API_KEY_INVALID/i.test(message)) throw new Error("PageSpeed Insights rejected the API key.");
    if (/has not been used|is disabled/i.test(message)) throw new Error("The PageSpeed Insights API is not enabled for this API key's project.");
    throw new Error(`PageSpeed Insights failed: ${message}`);
  }
  return parsePageSpeed(body);
}
