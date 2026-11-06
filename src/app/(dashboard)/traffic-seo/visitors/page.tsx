import type { Metadata } from "next";
import { PreviewNotice } from "@/components/data/preview-notice";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { VisitorsView } from "@/features/traffic/visitors-view";
import { getReferenceDate, resolveMonth } from "@/lib/data/calendar";
import { getTrafficChannels, getTrafficMetrics } from "@/lib/data/traffic";
import { formatMonth } from "@/lib/format";
import { toMonthKey } from "@/lib/month";

export const metadata: Metadata = { title: "Visitors" };

export default async function VisitorsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  const month = await resolveMonth((await searchParams).month);
  const [traffic, channels, today] = await Promise.all([getTrafficMetrics(), getTrafficChannels(), getReferenceDate()]);
  const monthLabel = formatMonth(month);

  return (
    <PageBody>
      <PageHeader title="Visitors" description={`Sessions, users and where they come from. Showing ${monthLabel}`} phase="P2" />
      <PreviewNotice phase="P2" />
      <VisitorsView
        month={month}
        monthLabel={monthLabel}
        inProgressMonth={toMonthKey(today)}
        traffic={traffic}
        channels={channels}
      />
    </PageBody>
  );
}
