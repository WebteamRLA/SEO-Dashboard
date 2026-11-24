import type { Metadata } from "next";
import { Panel } from "@/components/data/panel";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { PlannedFeatureGrid, type PlannedFeature } from "@/features/planned/planned-feature-grid";
import { BehaviorView } from "@/features/traffic/behavior-view";
import { getToday, resolvePagePeriod } from "@/lib/data/calendar";
import { getBehavior } from "@/lib/data/google";
import { describePeriod } from "@/lib/date-range";

export const metadata: Metadata = { title: "Behavior Analytics" };

/** Measures GA4 is not set up to record yet, with what it takes to start. */
const NOT_MEASURED: PlannedFeature[] = [
  {
    title: "Form drop-off",
    description:
      "GA4 is not recording form starts. Turn on Form interactions in GA4 (Admin > Data streams > Enhanced measurement) to see where visitors start a form and leave.",
  },
  {
    title: "Detailed scroll depth",
    description:
      "GA4 only records visitors who reach 90% of a page. Scroll triggers at 25%, 50% and 75% in Google Tag Manager would show where readers stop.",
  },
];

export default async function BehaviorAnalyticsPage({
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
  const { window, behavior } = await getBehavior(period.range, today);

  return (
    <PageBody>
      <PageHeader
        title="Behavior Analytics"
        description={`How visitors use the site and which pages lead to enquiries · Live from GA4 · ${describePeriod(period)}`}
      />
      <BehaviorView window={window} behavior={behavior} />
      <Panel title="Not measured yet" description="What it takes to start recording these in GA4">
        <PlannedFeatureGrid items={NOT_MEASURED} />
      </Panel>
    </PageBody>
  );
}
