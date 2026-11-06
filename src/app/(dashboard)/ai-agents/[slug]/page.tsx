import type { Metadata } from "next";
import { MonthLink } from "@/components/layout/month-link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PhaseBadge } from "@/components/data/phase-badge";
import { PreviewNotice } from "@/components/data/preview-notice";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { AgentStatusBadge } from "@/features/ai-agents/agent-status-badge";
import { LeadFilterNotice } from "@/features/ai-agents/lead-filter-notice";
import { getAiAgent } from "@/lib/data/operations";
import type { Phase } from "@/lib/types";

const PHASE_LABEL: Record<Phase, string> = {
  P1: "Phase 1",
  P2: "Phase 2",
  P3: "Phase 3",
};

type AgentPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: AgentPageProps): Promise<Metadata> {
  const { slug } = await params;
  const agent = await getAiAgent(slug);
  return { title: agent ? agent.name : "AI Agent not found" };
}

export default async function AiAgentPage({ params }: AgentPageProps) {
  const { slug } = await params;
  const agent = await getAiAgent(slug);
  if (!agent) notFound();

  return (
    <PageBody>
      <PageHeader title={agent.name} phase={agent.phase} />
      <MonthLink
        href="/ai-agents"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All AI agents
      </MonthLink>
      {agent.phase === "P1" ? (
        <LeadFilterNotice />
      ) : (
        <PreviewNotice phase={agent.phase}>
          No agent is running. The purpose, expected outcome, and capabilities below describe planned work.
        </PreviewNotice>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 rounded-lg border border-border bg-card p-4 lg:col-span-2">
          <section className="flex flex-col gap-1.5">
            <h2 className="text-sm font-medium">Purpose</h2>
            <p className="text-sm text-muted-foreground">{agent.purpose}</p>
          </section>
          <section className="flex flex-col gap-1.5">
            <h2 className="text-sm font-medium">Expected outcome</h2>
            <p className="text-sm text-muted-foreground">{agent.expectedOutcome}</p>
          </section>
          <section className="flex flex-col gap-1.5">
            <h2 className="text-sm font-medium">Planned capabilities</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {agent.capabilities.map((capability) => (
                <li key={capability}>{capability}</li>
              ))}
            </ul>
          </section>
        </div>

        <dl className="flex flex-col divide-y divide-border self-start rounded-lg border border-border bg-card">
          <div className="flex flex-col gap-1.5 p-4">
            <dt className="text-xs font-medium text-muted-foreground">Development phase</dt>
            <dd className="flex items-center gap-2 text-sm">
              <PhaseBadge phase={agent.phase} />
              {PHASE_LABEL[agent.phase]}
            </dd>
          </div>
          <div className="flex flex-col gap-1.5 p-4">
            <dt className="text-xs font-medium text-muted-foreground">Planned status</dt>
            <dd>
              <AgentStatusBadge status={agent.status} />
            </dd>
          </div>
        </dl>
      </div>
    </PageBody>
  );
}
