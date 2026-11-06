import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { RoadmapView } from "@/features/roadmap/roadmap-view";
import { getStrategyMonths, resolveMonth } from "@/lib/data/calendar";
import { getRoadmap } from "@/lib/data/work";
import { formatMonth } from "@/lib/format";

export const metadata: Metadata = { title: "Strategy Roadmap" };

export default async function RoadmapPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  const month = await resolveMonth((await searchParams).month);
  const [items, months] = await Promise.all([getRoadmap(), getStrategyMonths()]);

  return (
    <PageBody>
      <PageHeader title="Strategy Roadmap" description={`Showing ${formatMonth(month)}`} />
      <RoadmapView key={month} month={month} months={months} items={items} />
    </PageBody>
  );
}
