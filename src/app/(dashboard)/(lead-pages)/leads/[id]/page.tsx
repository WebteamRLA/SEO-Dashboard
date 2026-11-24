import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLead } from "@/lib/data/leads";
import { LeadDetail } from "@/features/leads/lead-detail";

export const metadata: Metadata = { title: "Lead Details" };

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();
  return <LeadDetail leadId={lead.id} />;
}
