import type { Metadata } from "next";
import { PreviewNotice } from "@/components/data/preview-notice";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { PlannedFeatureGrid, type PlannedFeature } from "@/features/planned/planned-feature-grid";

export const metadata: Metadata = { title: "Behavior Analytics" };

const PLANNED_MEASURES: PlannedFeature[] = [
  {
    title: "On-page engagement",
    description: "How long visitors stay on key pages and which parts of a page they interact with.",
  },
  {
    title: "Scroll depth",
    description: "How far down each page visitors scroll, to show where readers stop.",
  },
  {
    title: "Conversion paths",
    description: "The pages visitors view before they make an enquiry, so content can be matched to leads.",
  },
  {
    title: "Form drop-off",
    description: "Where visitors start a form and leave without submitting it, by form and by field.",
  },
];

export default function BehaviorAnalyticsPage() {
  return (
    <PageBody>
      <PageHeader
        phase="P3"
        title="Behavior Analytics"
        description="How visitors use pages after they arrive from search and social."
      />
      <PreviewNotice phase="P3">
        Nothing is connected or measured yet. This page lists the measures planned for this area.
      </PreviewNotice>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Planned measures</h2>
        <PlannedFeatureGrid items={PLANNED_MEASURES} />
      </section>
    </PageBody>
  );
}
