import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { SearchPerformanceView } from "@/features/traffic/search-performance-view";
import { getToday, resolvePagePeriod } from "@/lib/data/calendar";
import { getSearchAnalytics } from "@/lib/data/google";
import { describePeriod } from "@/lib/date-range";
import { searchTrend, trendUnit } from "@/server/google/analytics";

export const metadata: Metadata = { title: "Search Performance" };

export default async function SearchPerformancePage({
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
  const { window, search } = await getSearchAnalytics(period.range, today);
  const trend = search.status === "ok" && window ? searchTrend(search.data.daily, window.current, trendUnit(window.days)) : [];

  return (
    <PageBody>
      <PageHeader
        title="Search Performance"
        description={`Clicks, impressions, CTR and rankings · Live from Search Console · ${describePeriod(period)}`}
      />
      <SearchPerformanceView window={window} search={search} trend={trend} />
    </PageBody>
  );
}
