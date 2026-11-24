import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { StrategyRoadmap } from "@/features/roadmap/strategy-roadmap";
import { getToday } from "@/lib/data/calendar";
import { getStrategies } from "@/lib/data/strategy";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Strategy Roadmap" };

export default async function RoadmapPage() {
  const [strategies, today] = await Promise.all([getStrategies(), getToday()]);
  const lastImport = strategies.reduce<string | null>(
    (latest, strategy) => (latest === null || strategy.updatedAt > latest ? strategy.updatedAt : latest),
    null,
  );

  return (
    <PageBody>
      <PageHeader
        title="Strategy Roadmap"
        description={`SEO goals, monthly targets and progress · From the RLA SEO strategy sheet${lastImport ? `, updated ${formatDate(lastImport)}` : ""}`}
      />
      <StrategyRoadmap strategies={strategies} today={today} lastImport={lastImport} />
    </PageBody>
  );
}
