import type { Metadata } from "next";
import { PeriodLink } from "@/components/layout/period-link";
import { PhaseBadge } from "@/components/data/phase-badge";
import { PreviewNotice } from "@/components/data/preview-notice";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { AgentStatusBadge } from "@/features/ai-agents/agent-status-badge";
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
      <PreviewNotice phase="P3">
        No agent is running. Spam filtering by the Lead Filter Agent is planned for P2, and the other
        agents for P3.
      </PreviewNotice>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => (
          <li key={agent.slug} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-sm font-medium">
                <PeriodLink href={`/ai-agents/${agent.slug}`} className="hover:underline">
                  {agent.name}
                </PeriodLink>
              </h2>
              <PhaseBadge phase={agent.phase} />
            </div>
            <p className="text-sm text-muted-foreground">{agent.purpose}</p>
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-muted-foreground">Planned capabilities</p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {agent.capabilities.slice(0, 3).map((capability) => (
                  <li key={capability}>{capability}</li>
                ))}
              </ul>
            </div>
            <div className="mt-auto pt-1">
              <AgentStatusBadge status={agent.status} />
            </div>
          </li>
        ))}
      </ul>
    </PageBody>
  );
}
