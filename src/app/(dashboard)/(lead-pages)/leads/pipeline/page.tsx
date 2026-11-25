import type { Metadata } from "next";
import { LeadPipeline } from "@/features/leads/lead-pipeline";
import { resolvePagePeriod } from "@/lib/data/calendar";
import { describePeriod } from "@/lib/date-range";

export const metadata: Metadata = { title: "Lead Pipeline" };

export default async function LeadPipelinePage({
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
  return <LeadPipeline range={period.range} periodText={describePeriod(period)} />;
}
