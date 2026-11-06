import type { Metadata } from "next";
import { PreviewNotice } from "@/components/data/preview-notice";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { SearchPerformanceView } from "@/features/traffic/search-performance-view";
import { getReferenceDate, resolveMonth } from "@/lib/data/calendar";
import { getKeywords, getSearchMetrics } from "@/lib/data/traffic";
import { formatMonth } from "@/lib/format";
import { toMonthKey } from "@/lib/month";

export const metadata: Metadata = { title: "Search Performance" };

export default async function SearchPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  const month = await resolveMonth((await searchParams).month);
  const [search, keywords, today] = await Promise.all([getSearchMetrics(), getKeywords(), getReferenceDate()]);
  const monthLabel = formatMonth(month);

  return (
    <PageBody>
      <PageHeader title="Search Performance" description={`Clicks, impressions, CTR and rankings. Showing ${monthLabel}`} phase="P2" />
      <PreviewNotice phase="P2" />
      <SearchPerformanceView
        month={month}
        monthLabel={monthLabel}
        inProgressMonth={toMonthKey(today)}
        search={search}
        keywords={keywords}
      />
    </PageBody>
  );
}
