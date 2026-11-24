import { ArrowRight, ChevronRight } from "lucide-react";
import { PeriodLink } from "@/components/layout/period-link";
import { PhaseBadge } from "@/components/data/phase-badge";
import { PreviewNotice } from "@/components/data/preview-notice";
import { AgentStatusBadge } from "@/features/ai-agents/agent-status-badge";
import { agentVisual } from "@/features/ai-agents/agent-meta";
import type { AiAgent } from "@/lib/types";

const STEPS = [
  { title: "Agents watch", text: "They check search, traffic, leads and the site on a schedule." },
  { title: "Experts review", text: "The SEO team checks every finding and decides what to act on." },
  { title: "Work gets done", text: "Approved items go into the plan and show up in Tasks." },
];

export function AgentsOverview({ agents }: { agents: AiAgent[] }) {
  return (
    <>
      <section className="flex flex-col gap-5 rounded-xl border border-[var(--tile-blue)] bg-[#f5faff] p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex max-w-[720px] flex-col gap-1.5">
            <h2 className="text-xl leading-[1.3] font-semibold text-ink">AI agents working alongside the SEO team</h2>
            <p className="text-sm leading-relaxed text-ink-body">
              The automated checks and assistants planned for the dashboard. They would take on the repetitive checks, so
              the team can spend more time on strategy and content. Nothing changes on the site without the team&apos;s review.
            </p>
          </div>
          <span className="inline-flex h-7 shrink-0 items-center rounded-full border border-[var(--tile-blue)] bg-card px-3 text-[13px] font-semibold text-[#0060ad]">
            {agents.length} agents planned
          </span>
        </div>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative flex gap-3 md:pr-8">
              <div className="flex flex-1 gap-3">
                <span
                  aria-hidden
                  className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[#b3dbff] bg-card text-[13px] font-bold text-[#0060ad]"
                >
                  {index + 1}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-ink">{step.title}</span>
                  <span className="text-[13px] leading-normal text-ink-body">{step.text}</span>
                </span>
              </div>
              {index < STEPS.length - 1 ? (
                <ArrowRight className="absolute top-1.5 right-0 hidden size-4 text-[#4aa3f0] md:block" aria-hidden />
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <PreviewNotice phase="P3">
        No agent is running. Spam filtering by the Lead Filter Agent is planned for P2, and the other agents for P3.
      </PreviewNotice>

      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => {
          const visual = agentVisual(agent.slug);
          const Icon = visual.icon;
          return (
            <li key={agent.slug} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-2">
                <span
                  aria-hidden
                  className="flex size-10 items-center justify-center rounded-[10px]"
                  style={{ backgroundColor: visual.bg, color: visual.fg }}
                >
                  <Icon className="size-5" />
                </span>
                <span className="flex items-center gap-1.5">
                  <PhaseBadge phase={agent.phase} />
                  <AgentStatusBadge status={agent.status} />
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <h2 className="text-base font-semibold text-ink">
                  <PeriodLink href={`/ai-agents/${agent.slug}`} className="hover:text-primary">
                    {agent.name}
                  </PeriodLink>
                </h2>
                <p className="text-[13px] leading-normal text-ink-body">{agent.purpose}</p>
              </div>
              <ul className="list-disc space-y-1.5 pl-4 text-[13px] leading-normal text-ink-body marker:text-ink-quiet">
                {agent.capabilities.slice(0, 3).map((capability) => (
                  <li key={capability}>{capability}</li>
                ))}
              </ul>
              <div className="mt-auto flex items-center justify-between gap-2 border-t border-line-soft pt-3.5 text-xs">
                <span className="text-ink-quiet">Results will show in</span>
                <PeriodLink
                  href={visual.resultsHref}
                  className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-primary hover:underline"
                >
                  {visual.resultsLabel}
                  <ChevronRight className="size-3.5" aria-hidden />
                </PeriodLink>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
