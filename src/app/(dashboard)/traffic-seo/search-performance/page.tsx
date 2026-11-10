import type { Metadata } from "next";
import { PreviewNotice } from "@/components/data/preview-notice";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { SearchPerformanceView } from "@/features/traffic/search-performance-view";
import { getToday, resolvePagePeriod } from "@/lib/data/calendar";
import { getKeywords, getSearchMetrics } from "@/lib/data/traffic";
import { describePeriod } from "@/lib/date-range";
import { toMonthKey } from "@/lib/month";

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
  const period = await resolvePagePeriod(await searchParams);
  const [search, keywords, today] = await Promise.all([getSearchMetrics(), getKeywords(), getToday()]);
  const periodText = describePeriod(period);

  return (
    <PageBody>
      <PageHeader title="Search Performance" description={`Clicks, impressions, CTR and rankings. ${periodText}`} phase="P2" />
      <PreviewNotice phase="P2" />
      <SearchPerformanceView
        range={period.range}
        periodText={periodText}
        inProgressMonth={toMonthKey(today)}
        search={search}
        keywords={keywords}
      />
    </PageBody>
  );
}
