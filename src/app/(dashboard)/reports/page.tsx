import type { Metadata } from "next";
import { PreviewNotice } from "@/components/data/preview-notice";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { MonthlyReportsTable } from "@/features/reports/monthly-reports-table";
import { getMonthlyReports } from "@/lib/data/operations";

export const metadata: Metadata = { title: "Monthly Reports" };

export default async function MonthlyReportsPage() {
  const reports = await getMonthlyReports();

  return (
    <PageBody>
      <PageHeader
        phase="P2"
        title="Monthly Reports"
        description="One report per month, newest first. Figures match the sample data on the other pages."
      />
      <PreviewNotice phase="P2">
        Reports are sample previews. Generating, downloading and sending reports is planned for Phase 2 and is not available yet.
      </PreviewNotice>

      <MonthlyReportsTable reports={reports} />
    </PageBody>
  );
}
