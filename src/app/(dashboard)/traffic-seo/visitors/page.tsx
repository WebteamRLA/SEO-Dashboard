import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { VisitorsView } from "@/features/traffic/visitors-view";
import { getToday, resolvePagePeriod } from "@/lib/data/calendar";
import { getTrafficAnalytics } from "@/lib/data/google";
import { describePeriod } from "@/lib/date-range";
import { trafficTrend, trendUnit } from "@/server/google/analytics";

export const metadata: Metadata = { title: "Visitors" };

export default async function VisitorsPage({
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
  const { window, traffic } = await getTrafficAnalytics(period.range, today);
  const trend =
    traffic.status === "ok" && window ? trafficTrend(traffic.data.breakdown.daily, window.current, trendUnit(window.days)) : [];

  return (
    <PageBody>
      <PageHeader
        title="Visitors"
        description={`Sessions, users and where they come from · Live from GA4 · ${describePeriod(period)}`}
      />
      <VisitorsView window={window} traffic={traffic} trend={trend} />
    </PageBody>
  );
}
