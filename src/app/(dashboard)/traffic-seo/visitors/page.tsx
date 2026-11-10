import type { Metadata } from "next";
import { PreviewNotice } from "@/components/data/preview-notice";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { VisitorsView } from "@/features/traffic/visitors-view";
import { getToday, resolvePagePeriod } from "@/lib/data/calendar";
import { getTrafficChannels, getTrafficMetrics } from "@/lib/data/traffic";
import { describePeriod } from "@/lib/date-range";
import { toMonthKey } from "@/lib/month";

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
  const period = await resolvePagePeriod(await searchParams);
  const [traffic, channels, today] = await Promise.all([getTrafficMetrics(), getTrafficChannels(), getToday()]);
  const periodText = describePeriod(period);

  return (
    <PageBody>
      <PageHeader title="Visitors" description={`Sessions, users and where they come from. ${periodText}`} phase="P2" />
      <PreviewNotice phase="P2" />
      <VisitorsView
        range={period.range}
        periodText={periodText}
        inProgressMonth={toMonthKey(today)}
        traffic={traffic}
        channels={channels}
      />
    </PageBody>
  );
}
