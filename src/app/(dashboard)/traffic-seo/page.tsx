import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { TrafficOverviewView } from "@/features/traffic/traffic-overview-view";
import { getToday, resolvePagePeriod } from "@/lib/data/calendar";
import { getTrafficOverview } from "@/lib/data/google";
import { describePeriod } from "@/lib/date-range";

export const metadata: Metadata = { title: "Traffic" };

export default async function TrafficPage({
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
  const { window, overview } = await getTrafficOverview(period.range, today);

  return (
    <PageBody>
      <PageHeader title="Traffic" description={`Website visits · Live from GA4 · ${describePeriod(period)}`} />
      <TrafficOverviewView range={period.range} window={window} overview={overview} />
    </PageBody>
  );
}
