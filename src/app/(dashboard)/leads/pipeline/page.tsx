import type { Metadata } from "next";
import { LeadPipeline } from "@/features/leads/lead-pipeline";

export const metadata: Metadata = { title: "Lead Pipeline" };

export default function LeadPipelinePage() {
  return <LeadPipeline />;
}
