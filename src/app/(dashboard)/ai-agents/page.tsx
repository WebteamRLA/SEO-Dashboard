import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { AgentsOverview } from "@/features/ai-agents/agents-overview";
import { getAiAgents } from "@/lib/data/operations";

export const metadata: Metadata = { title: "AI Agents" };

export default async function AiAgentsPage() {
  const agents = await getAiAgents();

  return (
    <PageBody>
      <PageHeader
        phase="P3"
        title="AI Agents"
        description="The automated checks and assistants planned for the dashboard."
      />
      <AgentsOverview agents={agents} />
    </PageBody>
  );
}
