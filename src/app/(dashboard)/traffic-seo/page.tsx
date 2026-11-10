import type { Metadata } from "next";
import { PreviewNotice } from "@/components/data/preview-notice";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { SeoOverviewView } from "@/features/traffic/seo-overview-view";
import { getToday, resolvePagePeriod } from "@/lib/data/calendar";
import { getLandingPages, getSearchMetrics, getTrafficMetrics } from "@/lib/data/traffic";
import { describePeriod } from "@/lib/date-range";
import { toMonthKey } from "@/lib/month";

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
  const period = await resolvePagePeriod(await searchParams);
  const [search, traffic, landingPages, today] = await Promise.all([
    getSearchMetrics(),
    getTrafficMetrics(),
    getLandingPages(),
    getToday(),
  ]);
  const periodText = describePeriod(period);

  return (
    <PageBody>
      <PageHeader title="SEO Overview" description={`Search and traffic headlines. ${periodText}`} phase="P2" />
      <PreviewNotice phase="P2" />
      <SeoOverviewView
        range={period.range}
        periodText={periodText}
        inProgressMonth={toMonthKey(today)}
        search={search}
        traffic={traffic}
        landingPages={landingPages}
      />
    </PageBody>
  );
}
