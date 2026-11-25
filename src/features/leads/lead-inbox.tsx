"use client";

import { PeriodLink } from "@/components/layout/period-link";
import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { DataTable, type Column } from "@/components/data/data-table";
import { ALL, FilterSelect } from "@/components/data/filter-select";
import { Panel } from "@/components/data/panel";
import { SearchInput } from "@/components/data/search-input";
import { StatusBadge } from "@/components/data/status-badge";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { STAGE_META } from "@/lib/domain/leads";
import { formatDate } from "@/lib/format";
import { LEAD_SOURCES, PIPELINE_STAGES, type Lead, type PipelineColumn } from "@/lib/types";
import type { DateRange } from "@/lib/date-range";
import { LeadDrawer, openLead, openLeadOnClick } from "./lead-drawer";
import { filterLeads } from "./lead-logic";
import { LeadSummary } from "./lead-summary";
import {
  ACTIVE_FILTER_CLASS,
  ClearFiltersButton,
  LeadViewSwitch,
  plural,
  SourceIcon,
  ToolbarTextButton,
} from "./lead-ui";
import { useLeads } from "./leads-store";
import { PipelineUnavailable } from "./pipeline-unavailable";
import { SpamTag } from "./spam-tag";
import { SyncButton } from "./sync-button";

const SOURCE_OPTIONS = LEAD_SOURCES.map((source) => ({ value: source, label: source }));

const COLUMNS: Column<Lead>[] = [
  {
    id: "name",
    header: "Name",
    sortValue: (lead) => lead.name,
    cell: (lead) => (
      <div className="flex max-w-[280px] min-w-[140px] flex-col items-start sm:min-w-[200px] leading-[1.35]">
        <PeriodLink
          href={`/leads/${lead.id}`}
          onClick={openLeadOnClick(lead.id)}
          className="max-w-full truncate rounded-sm text-sm font-medium text-ink outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
        >
          {lead.name}
        </PeriodLink>
        {/* Older leads have only a company, which is then also the name; do not repeat it. */}
        {lead.company && lead.company !== lead.name ? (
          <span className="max-w-full truncate text-xs text-ink-quiet">{lead.company}</span>
        ) : null}
        {lead.spamFilteredBy ? <SpamTag by={lead.spamFilteredBy} className="mt-1" /> : null}
      </div>
    ),
  },
  {
    id: "email",
    header: "Email",
    hideBelow: "md",
    sortValue: (lead) => lead.email,
    cell: (lead) => <span className="text-ink-body">{lead.email ?? "—"}</span>,
  },
  {
    id: "source",
    header: "Came from",
    hideBelow: "lg",
    sortValue: (lead) => lead.attribution.source,
    cell: (lead) => (
      <div className="flex items-center gap-2">
        <SourceIcon source={lead.attribution.source} />
        <div className="flex min-w-0 flex-col leading-[1.35]">
          <span>{lead.teamwork?.tags.length ? lead.teamwork.tags.join(", ") : lead.attribution.source}</span>
          {lead.attribution.heardFrom ? (
            <span className="max-w-[200px] truncate text-xs text-ink-quiet" title={lead.attribution.heardFrom}>
              Heard from {lead.attribution.heardFrom}
            </span>
          ) : null}
        </div>
      </div>
    ),
  },
  {
    id: "submitted",
    header: "Added",
    hideBelow: "sm",
    sortValue: (lead) => lead.submittedAt,
    cell: (lead) => <span className="tabular-nums">{lead.submittedAt ? formatDate(lead.submittedAt) : "No date"}</span>,
  },
  {
    id: "stage",
    header: "Stage",
    sortValue: (lead) => lead.teamwork?.column.order ?? PIPELINE_STAGES.indexOf(lead.stage),
    cell: (lead) =>
      lead.teamwork ? (
        <ColumnPill column={lead.teamwork.column} />
      ) : (
        <StatusBadge tone={STAGE_META[lead.stage].tone} label={STAGE_META[lead.stage].label} />
      ),
  },
  {
    id: "assignee",
    header: "Assigned to",
    hideBelow: "xl",
    sortValue: (lead) => lead.teamwork?.assignees[0] ?? null,
    cell: (lead) => (
      <span className="block max-w-[180px] truncate text-ink-body">{lead.teamwork?.assignees.join(", ") || "—"}</span>
    ),
  },
  {
    // The design's row arrow. Rows open on click; the name cell holds the real link.
    id: "open",
    header: "Open lead",
    srOnlyHeader: true,
    width: "2.5rem",
    align: "right",
    cell: () => <ChevronRight className="ml-auto size-4 text-[#9ca3af]" aria-hidden />,
  },
];

/** The list follows the topbar date range: only leads added in `range` are shown. */
export function LeadInbox({ range, periodText }: { range: DateRange; periodText: string }) {
  const { leads, columns, error } = useLeads();
  const [search, setSearch] = useState("");
  const [source, setSource] = useState(ALL);
  const [stage, setStage] = useState(ALL);
  const [showSpam, setShowSpam] = useState(false);

  // The stage filter is the Teamwork board column.
  const stageOptions = useMemo(
    () => columns.map((column) => ({ value: String(column.id), label: column.name })),
    [columns],
  );
  const matching = useMemo(
    () =>
      filterLeads(leads, { search, source, range, stage: ALL }).filter(
        (lead) => stage === ALL || String(lead.teamwork?.column.id ?? "") === stage,
      ),
    [leads, search, source, range, stage],
  );

  // Spam stays out of the list unless asked for, or picked as the stage filter.
  const spamToggle = stage === ALL;
  const spamCount = spamToggle ? matching.filter((lead) => lead.stage === "spam").length : 0;
  const rows = useMemo(
    () => (spamToggle && !showSpam ? matching.filter((lead) => lead.stage !== "spam") : matching),
    [matching, spamToggle, showSpam],
  );

  const filtered = search.trim() !== "" || source !== ALL || stage !== ALL;
  function clearFilters() {
    setSearch("");
    setSource(ALL);
    setStage(ALL);
  }

  return (
    <PageBody>
      <PageHeader title="Lead Inbox" />
      <LeadSummary range={range} periodText={periodText} />
      <Panel
        id="all-leads"
        title="All leads"
        description={`Cards added to the Teamwork Pipeline board in this period (${periodText}), newest first. Leads change in Teamwork; Sync pulls the latest.`}
        actions={
          <>
            <SyncButton />
            <LeadViewSwitch view="list" />
          </>
        }
        flush
        toolbar={
          <div className="flex flex-col flex-wrap gap-2 sm:flex-row sm:items-center">
            <SearchInput value={search} onChange={setSearch} placeholder="Search lead, contact or email" />
            <FilterSelect
              label="Filter by source"
              allLabel="All sources"
              value={source}
              options={SOURCE_OPTIONS}
              onChange={setSource}
              className={source !== ALL ? ACTIVE_FILTER_CLASS : undefined}
            />
            <FilterSelect
              label="Filter by pipeline stage"
              allLabel="All stages"
              value={stage}
              options={stageOptions}
              onChange={setStage}
              className={stage !== ALL ? ACTIVE_FILTER_CLASS : undefined}
            />
            {filtered ? <ClearFiltersButton onClick={clearFilters} /> : null}
            <div className="flex items-center gap-3 text-xs text-ink-quiet sm:ml-auto">
              {spamToggle && spamCount > 0 ? (
                <ToolbarTextButton onClick={() => setShowSpam((value) => !value)}>
                  {showSpam ? `Hide spam (${spamCount})` : `Show spam (${spamCount})`}
                </ToolbarTextButton>
              ) : null}
              <span>{plural(rows.length, "lead")}</span>
            </div>
          </div>
        }
      >
        {error ? <PipelineUnavailable message={error} /> : null}
        <DataTable
          caption="Leads"
          columns={COLUMNS}
          rows={rows}
          getRowId={(lead) => lead.id}
          onRowClick={(lead) => openLead(lead.id)}
          defaultSort={{ columnId: "submitted", direction: "desc" }}
          emptyTitle={filtered ? "No leads match" : "No leads in this period"}
          emptyDescription={filtered ? "Try a different search, or clear a filter." : "Pick a longer period in the date range at the top."}
          bare
          footerSummary
        />
      </Panel>
      <LeadDrawer />
    </PageBody>
  );
}

/** A Teamwork board column as a pill, in the column's own colour. */
function ColumnPill({ column }: { column: PipelineColumn }) {
  return (
    <span className="inline-flex h-6 max-w-[200px] items-center gap-1.5 rounded-full bg-tone-neutral-bg px-2.5 text-xs font-semibold whitespace-nowrap text-ink-body">
      <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: column.color }} />
      <span className="truncate">{column.name}</span>
    </span>
  );
}
