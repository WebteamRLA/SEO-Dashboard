import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { ReportView } from "@/features/reports/report-view";
import { getToday } from "@/lib/data/calendar";
import { getMonthlyReport } from "@/lib/data/reports";
import { formatMonth } from "@/lib/format";
import { isMonthKey, isReportableMonth } from "@/server/reports/assemble";

export async function generateMetadata({ params }: { params: Promise<{ month: string }> }): Promise<Metadata> {
  const { month } = await params;
  return { title: isMonthKey(month) ? `${formatMonth(month)} report` : "Monthly report" };
}

export default async function MonthlyReportPage({ params }: { params: Promise<{ month: string }> }) {
  const { month } = await params;
  if (!isReportableMonth(month, await getToday())) notFound();
  const view = await getMonthlyReport(month);
  const label = formatMonth(month);

  return (
    <PageBody>
      <PageHeader title={`${label} report`} description="Right Left Agency · SEO and website performance, compared with the month before" />
      <ReportView view={view} monthLabel={label} />
    </PageBody>
  );
}
