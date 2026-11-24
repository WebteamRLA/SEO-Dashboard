import type { Metadata } from "next";
import { getToday } from "@/lib/data/calendar";
import { LeadInbox } from "@/features/leads/lead-inbox";

export const metadata: Metadata = { title: "Lead Inbox" };

export default async function LeadInboxPage() {
  const referenceDate = await getToday();
  return <LeadInbox referenceDate={referenceDate} />;
}
