"use client";

import { PeriodLink } from "@/components/layout/period-link";
import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { GripVertical, List, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/data/status-badge";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { STAGE_META } from "@/lib/domain/leads";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PIPELINE_STAGES, type Lead, type PipelineStage } from "@/lib/types";
import { DealValueDialog } from "./deal-value-dialog";
import { groupByStage } from "./lead-logic";
import { useLeads } from "./leads-store";
import { SpamTag } from "./spam-tag";

function toStage(value: unknown): PipelineStage | null {
  return PIPELINE_STAGES.find((stage) => stage === value) ?? null;
}

export function LeadPipeline() {
  const { leads, moveLead, getLead } = useLeads();
  const [hideSpam, setHideSpam] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingWonId, setPendingWonId] = useState<string | null>(null);

  const sensors = useSensors(
    // Separate sensors: a touch must hold before dragging, so swipes still scroll.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const columns = useMemo(
    () => groupByStage(leads).filter((column) => !(hideSpam && column.stage === "spam")),
    [leads, hideSpam],
  );

  const activeLead = activeId ? getLead(activeId) : undefined;
  const pendingLead = pendingWonId ? getLead(pendingWonId) : undefined;

  function requestMove(lead: Lead, stage: PipelineStage) {
    if (lead.stage === stage) return;
    if (stage === "won") {
      setPendingWonId(lead.id);
      return;
    }
    moveLead(lead.id, stage);
    toast.success(
      stage === "spam"
        ? `${lead.name} moved to Spam and tagged Filtered by Courtney`
        : `${lead.name} moved to ${STAGE_META[stage].label}`,
    );
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const stage = toStage(event.over?.id);
    const lead = getLead(String(event.active.id));
    if (stage && lead) requestMove(lead, stage);
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${getLead(String(active.id))?.name ?? "lead"}.`,
    onDragOver: ({ active, over }) => {
      const stage = toStage(over?.id);
      return stage
        ? `${getLead(String(active.id))?.name ?? "Lead"} is over ${STAGE_META[stage].label}.`
        : undefined;
    },
    onDragEnd: ({ active, over }) => {
      const stage = toStage(over?.id);
      const name = getLead(String(active.id))?.name ?? "Lead";
      return stage ? `${name} dropped on ${STAGE_META[stage].label}.` : `${name} returned to its column.`;
    },
    onDragCancel: ({ active }) => `Move cancelled. ${getLead(String(active.id))?.name ?? "Lead"} stays where it was.`,
  };

  return (
    <PageBody>
      <PageHeader
        title="Lead Pipeline"
        description="Drag a lead to another column to change its stage, or use the menu on each card."
        actions={
          <>
            <div className="flex items-center gap-2">
              <Switch id="hide-spam" checked={hideSpam} onCheckedChange={setHideSpam} />
              <Label htmlFor="hide-spam" className="text-sm font-normal">
                Hide Spam
              </Label>
            </div>
            <Button variant="outline" asChild>
              <PeriodLink href="/leads">
                <List aria-hidden />
                Inbox
              </PeriodLink>
            </Button>
          </>
        }
      />
        <DndContext
          id="lead-pipeline"
          sensors={sensors}
          // Slower than the default: on a phone one column fills the screen, and
          // full-speed edge scrolling carries a card several stages too far.
          autoScroll={{ acceleration: 2, threshold: { x: 0.12, y: 0.12 } }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
          accessibility={{ announcements }}
        >
          <div className="relative -mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
            <div className="flex w-max items-start gap-3">
              {columns.map((column) => (
                <StageColumn
                  key={column.stage}
                  stage={column.stage}
                  leads={column.leads}
                  totalValue={column.totalValue}
                  onMove={requestMove}
                />
              ))}
            </div>
          </div>
          <DragOverlay>{activeLead ? <LeadCardBody lead={activeLead} lifted /> : null}</DragOverlay>
        </DndContext>
      <DealValueDialog
        open={pendingLead !== undefined}
        onOpenChange={(open) => {
          if (!open) setPendingWonId(null);
        }}
        leadName={pendingLead?.name ?? ""}
        initialValue={pendingLead?.dealValue ?? null}
        onConfirm={(value) => {
          if (!pendingLead) return;
          moveLead(pendingLead.id, "won", value);
          toast.success(`${pendingLead.name} marked Won at ${formatCurrency(value)}`);
        }}
      />
    </PageBody>
  );
}

function StageColumn({
  stage,
  leads,
  totalValue,
  onMove,
}: {
  stage: PipelineStage;
  leads: Lead[];
  totalValue: number;
  onMove: (lead: Lead, stage: PipelineStage) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const meta = STAGE_META[stage];
  const headingId = `stage-${stage}`;

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={headingId}
      className={cn(
        "flex max-h-[calc(100dvh-14rem)] min-h-40 w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/40",
        isOver && "border-ring bg-muted",
      )}
    >
      <header className="flex flex-col gap-1.5 border-b border-border px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 id={headingId} className="sr-only">
            {meta.label}
          </h2>
          <StatusBadge tone={meta.tone} label={meta.label} />
          <span className="text-xs text-muted-foreground tabular-nums">
            {leads.length} {leads.length === 1 ? "lead" : "leads"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          Deal value {formatCurrency(totalValue)}
        </p>
      </header>
      <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
        {leads.length === 0 ? (
          <li className="px-2 py-6 text-center text-xs text-muted-foreground">No leads in this stage</li>
        ) : (
          leads.map((lead) => (
            <li key={lead.id}>
              <DraggableCard lead={lead} onMove={onMove} />
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

function DraggableCard({ lead, onMove }: { lead: Lead; onMove: (lead: Lead, stage: PipelineStage) => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id: lead.id });
  return (
    <div ref={setNodeRef} {...listeners} className={cn("touch-manipulation", isDragging && "opacity-40")}>
      <LeadCardBody
        lead={lead}
        handle={
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            aria-label={`Move ${lead.name} with the keyboard`}
            className="flex size-6 shrink-0 cursor-grab items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <GripVertical className="size-4" aria-hidden />
          </button>
        }
        menu={<StageMenu lead={lead} onMove={onMove} />}
      />
    </div>
  );
}

function LeadCardBody({
  lead,
  handle,
  menu,
  lifted = false,
}: {
  lead: Lead;
  handle?: React.ReactNode;
  menu?: React.ReactNode;
  lifted?: boolean;
}) {
  return (
    <article
      className={cn(
        "flex flex-col gap-1.5 rounded-md border border-border bg-card p-2.5 text-sm",
        lifted && "cursor-grabbing shadow-md",
      )}
    >
      <div className="flex items-start gap-1">
        {handle}
        <div className="min-w-0 flex-1">
          <PeriodLink
            href={`/leads/${lead.id}`}
            className="rounded-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            {lead.name}
          </PeriodLink>
          {lead.company && lead.company !== lead.name ? (
            <p className="truncate text-xs text-muted-foreground">{lead.company}</p>
          ) : null}
        </div>
        {menu}
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span>{lead.attribution.source}</span>
        {lead.dealValue ? (
          <span className="font-medium text-foreground tabular-nums">{formatCurrency(lead.dealValue)}</span>
        ) : null}
        {lead.spamFilteredBy ? <SpamTag by={lead.spamFilteredBy} /> : null}
      </div>
    </article>
  );
}

function StageMenu({ lead, onMove }: { lead: Lead; onMove: (lead: Lead, stage: PipelineStage) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Change stage for ${lead.name}`}>
          <MoreHorizontal aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Move to</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={lead.stage}
          onValueChange={(value) => {
            const stage = toStage(value);
            if (stage) onMove(lead, stage);
          }}
        >
          {PIPELINE_STAGES.map((stage) => (
            <DropdownMenuRadioItem key={stage} value={stage}>
              {STAGE_META[stage].label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
