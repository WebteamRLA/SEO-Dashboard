import type { Metadata } from "next";
import { PreviewNotice } from "@/components/data/preview-notice";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { PlannedFeatureGrid, type PlannedFeature } from "@/features/planned/planned-feature-grid";

export const metadata: Metadata = { title: "Social Analytics" };

const FACEBOOK_MEASURES: PlannedFeature[] = [
  { title: "Reach", description: "How many people saw posts from the Facebook page." },
  { title: "Engagement", description: "Reactions, comments, and shares on Facebook posts." },
  { title: "Followers", description: "Change in the number of people following the page." },
  { title: "Clicks to the site", description: "Clicks from Facebook posts to pages on the website." },
];

const LINKEDIN_MEASURES: PlannedFeature[] = [
  { title: "Reach", description: "How many people saw posts from the LinkedIn company page." },
  { title: "Engagement", description: "Reactions, comments, and reposts on LinkedIn posts." },
  { title: "Followers", description: "Change in the number of people following the company page." },
  { title: "Clicks to the site", description: "Clicks from LinkedIn posts to pages on the website." },
];

export default function SocialAnalyticsPage() {
  return (
    <PageBody>
      <PageHeader
        phase="P3"
        title="Social Analytics"
        description="Facebook and LinkedIn performance, planned to be tracked in one place."
      />
      <PreviewNotice phase="P3">
        Nothing is connected yet. No platform figures are shown on this page. The lists below describe what will be tracked
        for each platform.
      </PreviewNotice>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Facebook</h2>
        <PlannedFeatureGrid items={FACEBOOK_MEASURES} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">LinkedIn</h2>
        <PlannedFeatureGrid items={LINKEDIN_MEASURES} />
      </section>
    </PageBody>
  );
}
