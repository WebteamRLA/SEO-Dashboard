import type { Metadata } from "next";
import { PreviewNotice } from "@/components/data/preview-notice";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { RevenueView } from "@/features/revenue/revenue-view";
import { getAvailableMonths, getToday, resolvePagePeriod } from "@/lib/data/calendar";
import { describePeriod } from "@/lib/date-range";
import { toMonthKey } from "@/lib/month";

export const metadata: Metadata = { title: "Revenue" };

export default async function RevenuePage({
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
  const [months, today] = await Promise.all([getAvailableMonths(), getToday()]);
  const periodText = describePeriod(period);

  return (
    <PageBody>
      <PageHeader title="Revenue" description={`Won deals from the lead pipeline. ${periodText}`} phase="P2" />
      <PreviewNotice phase="P2" />
      <RevenueView range={period.range} periodText={periodText} months={months.filter((key) => key !== toMonthKey(today))} />
    </PageBody>
  );
}
