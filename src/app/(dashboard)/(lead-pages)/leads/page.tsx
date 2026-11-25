import type { Metadata } from "next";
import { resolvePagePeriod } from "@/lib/data/calendar";
import { describePeriod } from "@/lib/date-range";
import { LeadInbox } from "@/features/leads/lead-inbox";

export const metadata: Metadata = { title: "Lead Inbox" };

export default async function LeadInboxPage({
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
  return <LeadInbox range={period.range} periodText={describePeriod(period)} />;
}
