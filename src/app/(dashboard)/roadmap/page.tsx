import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { RoadmapView } from "@/features/roadmap/roadmap-view";
import { getStrategyMonths, resolvePagePeriod } from "@/lib/data/calendar";
import { getRoadmap } from "@/lib/data/work";
import { describePeriod } from "@/lib/date-range";

export const metadata: Metadata = { title: "Strategy Roadmap" };

export default async function RoadmapPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string | string[];
    from?: string | string[];
    to?: string | string[];
    month?: string | string[];
  }>;
}) {
  const period = await resolvePagePeriod(await searchParams);
  const [items, months] = await Promise.all([getRoadmap(), getStrategyMonths()]);

  return (
    <PageBody>
      <PageHeader title="Strategy Roadmap" description={describePeriod(period)} />
      <RoadmapView
        key={`${period.range.from}_${period.range.to}`}
        range={period.range}
        months={months}
        items={items}
      />
    </PageBody>
  );
}
