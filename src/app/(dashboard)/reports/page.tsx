import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { ReportList } from "@/features/reports/report-list";
import { getToday } from "@/lib/data/calendar";
import { getReportList } from "@/lib/data/reports";

export const metadata: Metadata = { title: "Monthly Reports" };

export default async function MonthlyReportsPage() {
  const rows = await getReportList(await getToday());
  return (
    <PageBody>
      <PageHeader
        title="Monthly Reports"
        description="One report per complete month: search, traffic, enquiries, leads, work and strategy progress."
      />
      <ReportList rows={rows} />
      <p className="text-xs text-ink-quiet">
        Draft months show live figures. Final months show the figures frozen when they were finalised. Search Console data starts in January 2026.
      </p>
    </PageBody>
  );
}
