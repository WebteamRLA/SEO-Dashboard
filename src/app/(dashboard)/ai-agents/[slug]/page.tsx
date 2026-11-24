import type { Metadata } from "next";
import { PeriodLink } from "@/components/layout/period-link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Panel } from "@/components/data/panel";
import { PhaseBadge } from "@/components/data/phase-badge";
import { PreviewNotice } from "@/components/data/preview-notice";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { AgentStatusBadge } from "@/features/ai-agents/agent-status-badge";
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
      <PeriodLink
        href="/ai-agents"
        className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-ink-quiet hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All AI agents
      </PeriodLink>
      {/* P1 work ships as a real feature, so only planned phases get a preview notice. */}
      {agent.phase !== "P1" && (
        <PreviewNotice phase={agent.phase}>
          No agent is running. The purpose, expected outcome, and capabilities below describe planned work.
        </PreviewNotice>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title={agent.name}
          description={agent.purpose}
          actions={<AgentStatusBadge status={agent.status} />}
          bodyClassName="flex flex-col gap-6"
        >
          <section className="flex flex-col gap-1.5">
            <h3 className="text-sm font-semibold text-ink">Expected outcome</h3>
            <p className="text-[13px] leading-normal text-ink-body">{agent.expectedOutcome}</p>
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-ink">Planned capabilities</h3>
            <ul className="list-disc space-y-1.5 pl-4 text-[13px] leading-normal text-ink-body marker:text-ink-quiet">
              {agent.capabilities.map((capability) => (
                <li key={capability}>{capability}</li>
              ))}
            </ul>
          </section>
        </Panel>

        <dl className="flex flex-col divide-y divide-line-soft self-start rounded-xl border border-border bg-card">
          <div className="flex flex-col gap-1.5 p-5">
            <dt className="text-xs font-medium text-ink-quiet">Development phase</dt>
            <dd className="flex items-center gap-2 text-[13px] text-ink-body">
              <PhaseBadge phase={agent.phase} />
              {PHASE_LABEL[agent.phase]}
            </dd>
          </div>
          <div className="flex flex-col gap-1.5 p-5">
            <dt className="text-xs font-medium text-ink-quiet">Planned status</dt>
            <dd>
              <AgentStatusBadge status={agent.status} />
            </dd>
          </div>
        </dl>
      </div>
    </PageBody>
  );
}
