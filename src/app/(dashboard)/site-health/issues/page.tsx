import type { Metadata } from "next";
import { PreviewNotice } from "@/components/data/preview-notice";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { IssueLogView } from "@/features/site-health/issue-log-view";
import { getSiteIssues } from "@/lib/data/operations";

export const metadata: Metadata = { title: "Issue Log" };

export default async function IssueLogPage() {
  const issues = await getSiteIssues();

  return (
    <PageBody>
      <PageHeader
        phase="P2"
        title="Issue Log"
        description="Issues logged against pages on the website. Sorted by severity, most severe first by default."
      />
      <PreviewNotice phase="P2">
        The issues listed are sample entries. No audit or scan has been run from this dashboard.
      </PreviewNotice>

      <IssueLogView issues={issues} />
    </PageBody>
  );
}
