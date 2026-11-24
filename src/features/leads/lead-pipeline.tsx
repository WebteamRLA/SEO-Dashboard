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
import { GripVertical, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { ALL, FilterSelect } from "@/components/data/filter-select";
import { Panel } from "@/components/data/panel";
import { SearchInput } from "@/components/data/search-input";
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
import { STAGE_META } from "@/lib/domain/leads";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LEAD_SOURCES, PIPELINE_STAGES, type Lead, type PipelineStage } from "@/lib/types";
import { DealValueDialog } from "./deal-value-dialog";
import { filterLeads, groupByStage } from "./lead-logic";
import { LeadSummary } from "./lead-summary";
import {
  ACTIVE_FILTER_CLASS,
  ClearFiltersButton,
  formatMoneyShort,
  LeadViewSwitch,
  plural,
  SourceIcon,
  StageDot,
  ToolbarTextButton,
} from "./lead-ui";
import { useLeads } from "./leads-store";
import { SpamTag } from "./spam-tag";

const SOURCE_OPTIONS = LEAD_SOURCES.map((source) => ({ value: source, label: source }));

function toStage(value: unknown): PipelineStage | null {
  return PIPELINE_STAGES.find((stage) => stage === value) ?? null;
}

export function LeadPipeline() {
  const { leads, moveLead, getLead } = useLeads();
  const [hideSpam, setHideSpam] = useState(false);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState(ALL);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingWonId, setPendingWonId] = useState<string | null>(null);

  const sensors = useSensors(
    // Separate sensors: a touch must hold before dragging, so swipes still scroll.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  // Search and source narrow what the board shows. The board has no date
  // filter, so no reference date is needed.
  const visible = useMemo(
    () => filterLeads(leads, { search, source, period: ALL, stage: ALL }, ""),
    [leads, search, source],
  );
  const columns = useMemo(
    () => groupByStage(visible).filter((column) => !(hideSpam && column.stage === "spam")),
    [visible, hideSpam],
  );
  const spamCount = visible.filter((lead) => lead.stage === "spam").length;
  const shownCount = columns.reduce((sum, column) => sum + column.leads.length, 0);
  const filtered = search.trim() !== "" || source !== ALL;

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
      <PageHeader title="Lead Pipeline" />
      <LeadSummary />
      <Panel
        id="all-leads"
        title="All leads"
        description="Drag a lead to another column to change its stage, or use the menu on each card."
        actions={<LeadViewSwitch view="pipeline" />}
        flush
        toolbar={
          <div className="flex flex-col flex-wrap gap-2 sm:flex-row sm:items-center">
            <SearchInput value={search} onChange={setSearch} placeholder="Search name, email or company" />
            <FilterSelect
              label="Filter by source"
              allLabel="All sources"
              value={source}
              options={SOURCE_OPTIONS}
              onChange={setSource}
              className={source !== ALL ? ACTIVE_FILTER_CLASS : undefined}
            />
            {filtered ? (
              <ClearFiltersButton
                onClick={() => {
                  setSearch("");
                  setSource(ALL);
                }}
              />
            ) : null}
            <div className="flex items-center gap-3 text-xs text-ink-quiet sm:ml-auto">
              <ToolbarTextButton onClick={() => setHideSpam((value) => !value)}>
                {hideSpam ? `Show spam (${spamCount})` : "Hide spam"}
              </ToolbarTextButton>
              <span>{plural(shownCount, "lead")}</span>
            </div>
          </div>
        }
      >
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
          <div
            role="region"
            aria-label="Pipeline, scroll sideways for more stages"
            tabIndex={0}
            className="scroll-thin relative overflow-x-auto rounded-b-xl px-5 pt-4 pb-5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <div className="flex w-max items-start gap-4">
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
      </Panel>
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
        "flex max-h-[calc(100dvh-12rem)] min-h-40 w-[288px] shrink-0 flex-col gap-2 rounded-xl border border-border bg-[#F9FAFB] p-2.5 transition-colors",
        isOver && "border-primary bg-tone-info-bg",
      )}
    >
      <header className="flex flex-col gap-0.5 px-0.5 pt-0.5 pb-1">
        <div className="flex items-center gap-2">
          <StageDot stage={stage} />
          <h3 id={headingId} className="text-[13px] font-semibold text-ink">
            {meta.label}
          </h3>
          <span className="ml-auto text-xs font-semibold text-ink-body tabular-nums">
            {leads.length}
            <span className="sr-only"> {leads.length === 1 ? "lead" : "leads"}</span>
          </span>
        </div>
        <p className="text-xs text-ink-quiet tabular-nums">
          {totalValue > 0 ? `Deal value ${formatCurrency(totalValue)}` : "No deal value"}
        </p>
      </header>
      <ul className="scroll-thin -mx-1 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-1 pb-0.5">
        {leads.length === 0 ? (
          <li className="px-1 py-3.5 text-center text-xs text-ink-quiet">No leads in this stage</li>
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
            className="-ml-1 flex size-6 shrink-0 cursor-grab items-center justify-center rounded-md text-[#9CA3AF] outline-none hover:bg-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-ring"
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
        "flex flex-col gap-1.5 rounded-[10px] border border-input bg-card px-3 py-2.5",
        lifted && "cursor-grabbing shadow-[0_12px_32px_#1118271F]",
      )}
    >
      <div className="flex items-start gap-1">
        {handle}
        <div className="flex min-w-0 flex-1 flex-col leading-[1.35]">
          <PeriodLink
            href={`/leads/${lead.id}`}
            className="w-fit max-w-full truncate rounded-sm text-[13px] font-semibold text-ink outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
          >
            {lead.name}
          </PeriodLink>
          {lead.company && lead.company !== lead.name ? (
            <p className="truncate text-xs text-ink-quiet">{lead.company}</p>
          ) : null}
        </div>
        {menu}
      </div>
      <div className="flex items-center justify-between gap-1.5">
        <span className="flex min-w-0 items-center gap-2 text-xs text-ink-body">
          <SourceIcon source={lead.attribution.source} />
          <span className="truncate">{lead.attribution.source}</span>
        </span>
        {lead.dealValue ? (
          <span
            className={cn(
              "shrink-0 text-xs font-semibold tabular-nums",
              lead.stage === "won" ? "text-tone-good-fg" : "text-ink",
            )}
            title={formatCurrency(lead.dealValue)}
          >
            {formatMoneyShort(lead.dealValue)}
          </span>
        ) : null}
      </div>
      {lead.spamFilteredBy ? <SpamTag by={lead.spamFilteredBy} className="self-start" /> : null}
    </article>
  );
}

function StageMenu({ lead, onMove }: { lead: Lead; onMove: (lead: Lead, stage: PipelineStage) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="-mr-1.5 -mt-0.5 size-7 text-ink-quiet" aria-label={`Change stage for ${lead.name}`}>
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
