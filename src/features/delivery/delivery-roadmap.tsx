"use client";

import { useId, useState } from "react";
import { CircleCheck, ChevronRight, Circle } from "lucide-react";
import { Panel } from "@/components/data/panel";
import { PhaseBadge } from "@/components/data/phase-badge";
import { ProgressBar } from "@/components/data/progress-bar";
import { StatusBadge } from "@/components/data/status-badge";
import { DataTable, type Column } from "@/components/data/data-table";
import { formatDate } from "@/lib/format";
import { DELIVERY_STATUS_META, moduleProgress } from "@/lib/domain/delivery";
import type { DeliveryModule, Phase, Progress } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface PhaseSection {
  phase: Phase;
  title: string;
  progress: Progress;
  modules: DeliveryModule[];
}

export function DeliveryRoadmap({ sections }: { sections: PhaseSection[] }) {
  return (
    <div className="flex flex-col gap-8">
      {sections.map((section) => (
        <PhaseTable key={section.phase} section={section} />
      ))}
    </div>
  );
}

function PhaseTable({ section }: { section: PhaseSection }) {
  const headingId = useId();

  const columns: Column<DeliveryModule>[] = [
    {
      id: "name",
      header: "Module",
      cell: (module) => <ModuleName module={module} />,
      sortValue: (module) => module.name,
    },
    {
      id: "phase",
      header: "Phase",
      hideBelow: "sm",
      cell: (module) => <PhaseBadge phase={module.phase} />,
    },
    {
      id: "date",
      header: "Planned date",
      hideBelow: "md",
      cell: (module) => (module.plannedDate ? formatDate(module.plannedDate) : "To be confirmed"),
    },
    {
      id: "status",
      header: "Status",
      cell: (module) => {
        const meta = DELIVERY_STATUS_META[module.status];
        return <StatusBadge tone={meta.tone} label={meta.label} />;
      },
    },
    {
      id: "progress",
      header: "Progress",
      cell: (module) => {
        const progress = moduleProgress(module);
        return (
          <ProgressBar
            progress={progress}
            label={`${module.name} progress`}
            showLabel
            tone={progress.percent === 100 ? "good" : "info"}
            className="min-w-28"
          />
        );
      },
    },
  ];

  return (
    <Panel
      id={headingId}
      title={section.title}
      description={`${section.progress.completed} of ${section.progress.total} steps finished`}
      actions={
        <div className="w-32 sm:w-64">
          <ProgressBar
            progress={section.progress}
            label={`${section.title} overall progress`}
            tone={section.progress.percent === 100 ? "good" : "info"}
          />
          <p className="mt-1 text-right text-xs text-ink-quiet">{section.progress.percent}%</p>
        </div>
      }
      flush
    >
      <DataTable
        bare
        caption={`${section.title} modules and their progress`}
        columns={columns}
        rows={section.modules}
        getRowId={(module) => module.id}
        pageSize={20}
        emptyTitle="No modules in this phase"
        emptyDescription="Modules appear here once they are added to the roadmap."
      />
    </Panel>
  );
}

/** A module name that expands to show its delivery steps. */
function ModuleName({ module }: { module: DeliveryModule }) {
  const [open, setOpen] = useState(false);
  const listId = useId();

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1.5 rounded-sm text-left font-semibold text-ink outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronRight
          className={cn("size-3.5 shrink-0 text-ink-quiet transition-transform", open && "rotate-90")}
          aria-hidden
        />
        {module.name}
      </button>
      <ul
        id={listId}
        hidden={!open}
        className={cn("flex-col gap-1.5 border-l border-line pl-3", open ? "flex" : "hidden")}
      >
        {module.steps.map((step, index) => (
          <li key={`${index}-${step.label}`} className="flex items-center gap-2 text-[13px]">
            {step.done ? (
              <CircleCheck className="size-3.5 shrink-0 text-status-good" aria-hidden />
            ) : (
              <Circle className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <span className={cn(step.done ? "text-ink-body" : "text-ink-quiet")}>
              <span className="sr-only">{step.done ? "Done: " : "Pending: "}</span>
              {step.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
