import type { Metadata } from "next";
import { Panel } from "@/components/data/panel";
import { SourceNotice } from "@/components/data/source-notice";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { PlannedFeatureGrid, type PlannedFeature } from "@/features/planned/planned-feature-grid";
import { SocialView } from "@/features/traffic/social-view";
import { getToday, resolvePagePeriod } from "@/lib/data/calendar";
import { getSocialTraffic } from "@/lib/data/google";
import { describePeriod } from "@/lib/date-range";
import { socialTrend } from "@/server/google/engagement";
import { trendUnit } from "@/server/google/analytics";

export const metadata: Metadata = { title: "Social Analytics" };

const PLATFORM_MEASURES: PlannedFeature[] = [
  { title: "Reach", description: "How many people saw the page's posts." },
  { title: "Engagement", description: "Reactions, comments, and shares or reposts on posts." },
  { title: "Followers", description: "Change in the number of people following the page." },
  { title: "Top posts", description: "Which posts reached and engaged the most people." },
];

const PLATFORMS = [
  {
    name: "Facebook",
    message: "Needs access to the RLA Facebook Page through a Meta app, granted by a Page admin.",
  },
  {
    name: "LinkedIn",
    message: "Needs LinkedIn Community Management API access for the RLA company page, approved by LinkedIn.",
  },
];

export default async function SocialAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string | string[];
    from?: string | string[];
    to?: string | string[];
    month?: string | string[];
  }>;
}) {
  const [period, today] = await Promise.all([searchParams.then(resolvePagePeriod), getToday()]);
  const { window, social } = await getSocialTraffic(period.range, today);
  const trend = social.status === "ok" && window ? socialTrend(social.data.daily, window.current, trendUnit(window.days)) : [];

  return (
    <PageBody>
      <PageHeader
        title="Social Analytics"
        description={`Visits to the website from social networks · Live from GA4 · ${describePeriod(period)}`}
      />
      <SocialView window={window} social={social} trend={trend} />

      {PLATFORMS.map((platform) => (
        <Panel key={platform.name} title={`${platform.name} page performance`}>
          <div className="flex flex-col gap-4">
            <SourceNotice source={{ status: "not-connected", message: platform.message }} />
            <PlannedFeatureGrid items={PLATFORM_MEASURES} />
          </div>
        </Panel>
      ))}
    </PageBody>
  );
}
