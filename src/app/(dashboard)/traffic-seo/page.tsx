import type { Metadata } from "next";
import { PreviewNotice } from "@/components/data/preview-notice";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { SeoOverviewView } from "@/features/traffic/seo-overview-view";
import { getReferenceDate, resolveMonth } from "@/lib/data/calendar";
import { getLandingPages, getSearchMetrics, getTrafficMetrics } from "@/lib/data/traffic";
import { formatMonth } from "@/lib/format";
import { toMonthKey } from "@/lib/month";

export const metadata: Metadata = { title: "SEO Overview" };

export default async function SeoOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  const month = await resolveMonth((await searchParams).month);
  const [search, traffic, landingPages, today] = await Promise.all([
    getSearchMetrics(),
    getTrafficMetrics(),
    getLandingPages(),
    getReferenceDate(),
  ]);
  const monthLabel = formatMonth(month);

  return (
    <PageBody>
      <PageHeader title="SEO Overview" description={`Search and traffic headlines. Showing ${monthLabel}`} phase="P2" />
      <PreviewNotice phase="P2" />
      <SeoOverviewView
        month={month}
        monthLabel={monthLabel}
        inProgressMonth={toMonthKey(today)}
        search={search}
        traffic={traffic}
        landingPages={landingPages}
      />
    </PageBody>
  );
}
