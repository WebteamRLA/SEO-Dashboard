import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { SeoOverviewView } from "@/features/traffic/seo-overview-view";
import { getToday, resolvePagePeriod } from "@/lib/data/calendar";
import { getSearchAnalytics, getTrafficAnalytics } from "@/lib/data/google";
import { describePeriod } from "@/lib/date-range";
import { joinLandingPages, searchTrend, trendUnit } from "@/server/google/analytics";

export const metadata: Metadata = { title: "SEO Overview" };

export default async function SeoOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string | string[];
    from?: string | string[];
    to?: string | string[];
    month?: string | string[];
  }>;
}) {
  const [period, today] = await Promise.all([searchParams.then(resolvePagePeriod), getToday()]);
  const [{ window, search }, { traffic }] = await Promise.all([
    getSearchAnalytics(period.range, today),
    getTrafficAnalytics(period.range, today),
  ]);
  const trend = search.status === "ok" && window ? searchTrend(search.data.daily, window.current, trendUnit(window.days)) : [];
  const landingPages = joinLandingPages(
    search.status === "ok" ? search.data.pages : [],
    traffic.status === "ok" ? traffic.data.breakdown.landingPages : [],
  );

  return (
    <PageBody>
      <PageHeader
        title="SEO Overview"
        description={`Search and traffic headlines · Live from Search Console and GA4 · ${describePeriod(period)}`}
      />
      <SeoOverviewView window={window} search={search} traffic={traffic} trend={trend} landingPages={landingPages} />
    </PageBody>
  );
}
