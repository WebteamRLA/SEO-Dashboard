import type { Metadata } from "next";
import { CircleCheck, FileInput, TriangleAlert } from "lucide-react";
import { PreviewNotice } from "@/components/data/preview-notice";
import { MetricCard, MetricGrid } from "@/components/data/metric-card";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { FormHealthTable } from "@/features/site-health/form-health-table";
import { formatNumber } from "@/lib/format";
import { getMonitoredForms } from "@/lib/data/operations";

export const metadata: Metadata = { title: "Form Health" };

export default async function FormHealthPage() {
  const forms = await getMonitoredForms();
  const monitored = forms.filter((form) => form.monitoring).length;
  const paused = forms.length - monitored;
  const healthy = forms.filter((form) => form.status === "healthy").length;
  const failedSubmissions = forms.reduce((sum, form) => sum + form.failedSubmissions, 0);

  return (
    <PageBody>
      <PageHeader
        phase="P2"
        title="Form Health"
        description="Connection and submission health for the website's forms."
      />
      <PreviewNotice phase="P2">
        Form statuses and failure counts are sample values. No form has been submitted or tested from this dashboard.
      </PreviewNotice>

      <MetricGrid>
        <MetricCard
          label="Monitored forms"
          value={formatNumber(forms.length)}
          detail={`${formatNumber(monitored)} active, ${formatNumber(paused)} paused`}
          icon={FileInput}
        />
        <MetricCard
          label="Healthy"
          value={formatNumber(healthy)}
          detail={`of ${formatNumber(forms.length)} monitored forms`}
          icon={CircleCheck}
        />
        <MetricCard
          label="Failed submissions"
          value={formatNumber(failedSubmissions)}
          detail="Across all monitored forms"
          icon={TriangleAlert}
        />
      </MetricGrid>

      <FormHealthTable forms={forms} />
    </PageBody>
  );
}
