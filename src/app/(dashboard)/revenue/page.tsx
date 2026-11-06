import type { Metadata } from "next";
import { PreviewNotice } from "@/components/data/preview-notice";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { RevenueView } from "@/features/revenue/revenue-view";
import { getAvailableMonths, getReferenceDate, resolveMonth } from "@/lib/data/calendar";
import { formatMonth } from "@/lib/format";
import { toMonthKey } from "@/lib/month";

export const metadata: Metadata = { title: "Revenue" };

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  const month = await resolveMonth((await searchParams).month);
  const [months, today] = await Promise.all([getAvailableMonths(), getReferenceDate()]);
  const monthLabel = formatMonth(month);

  return (
    <PageBody>
      <PageHeader title="Revenue" description={`Won deals from the lead pipeline. Showing ${monthLabel}`} phase="P2" />
      <PreviewNotice phase="P2" />
      <RevenueView month={month} monthLabel={monthLabel} months={months.filter((key) => key !== toMonthKey(today))} />
    </PageBody>
  );
}
