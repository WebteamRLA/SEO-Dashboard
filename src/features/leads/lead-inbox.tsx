"use client";

import { PeriodLink, usePeriodHref } from "@/components/layout/period-link";
import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { DataTable, type Column } from "@/components/data/data-table";
import { ALL, FilterSelect } from "@/components/data/filter-select";
import { Panel } from "@/components/data/panel";
import { SearchInput } from "@/components/data/search-input";
import { StatusBadge } from "@/components/data/status-badge";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { STAGE_META } from "@/lib/domain/leads";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LEAD_SOURCES, PIPELINE_STAGES, type Lead } from "@/lib/types";
import { DATE_PRESETS, filterLeads } from "./lead-logic";
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
import { SpamTag } from "./spam-tag";

const SOURCE_OPTIONS = LEAD_SOURCES.map((source) => ({ value: source, label: source }));
const STAGE_OPTIONS = PIPELINE_STAGES.map((stage) => ({ value: stage, label: STAGE_META[stage].label }));
const DATE_OPTIONS = DATE_PRESETS.map((preset) => ({ value: preset.value, label: preset.label }));

const COLUMNS: Column<Lead>[] = [
  {
    id: "name",
    header: "Name",
    sortValue: (lead) => lead.name,
    cell: (lead) => (
      <div className="flex max-w-[280px] min-w-[140px] flex-col items-start sm:min-w-[200px] leading-[1.35]">
        <PeriodLink
          href={`/leads/${lead.id}`}
          onClick={(event) => event.stopPropagation()}
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
          <span>{lead.attribution.source}</span>
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
    header: "Submitted",
    hideBelow: "sm",
    sortValue: (lead) => lead.submittedAt,
    cell: (lead) => <span className="tabular-nums">{lead.submittedAt ? formatDate(lead.submittedAt) : "No date"}</span>,
  },
  {
    id: "stage",
    header: "Stage",
    sortValue: (lead) => PIPELINE_STAGES.indexOf(lead.stage),
    cell: (lead) => <StatusBadge tone={STAGE_META[lead.stage].tone} label={STAGE_META[lead.stage].label} />,
  },
  {
    id: "deal-value",
    header: "Deal value",
    align: "right",
    hideBelow: "sm",
    sortValue: (lead) => lead.dealValue,
    cell: (lead) =>
      lead.dealValue === null ? (
        <span className="text-[#9CA3AF]">—</span>
      ) : (
        <span className={cn("tabular-nums", lead.stage === "won" ? "text-tone-good-fg" : "text-ink")}>
          {formatCurrency(lead.dealValue)}
        </span>
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

export function LeadInbox({ referenceDate }: { referenceDate: string }) {
  const { leads } = useLeads();
  const withPeriod = usePeriodHref();
  const [search, setSearch] = useState("");
  const [source, setSource] = useState(ALL);
  const [period, setPeriod] = useState(ALL);
  const [stage, setStage] = useState(ALL);
  const [showSpam, setShowSpam] = useState(false);

  const matching = useMemo(
    () => filterLeads(leads, { search, source, period, stage }, referenceDate),
    [leads, search, source, period, stage, referenceDate],
  );

  // Spam stays out of the list unless asked for, or picked as the stage filter.
  const spamToggle = stage === ALL;
  const spamCount = spamToggle ? matching.filter((lead) => lead.stage === "spam").length : 0;
  const rows = useMemo(
    () => (spamToggle && !showSpam ? matching.filter((lead) => lead.stage !== "spam") : matching),
    [matching, spamToggle, showSpam],
  );

  const filtered = search.trim() !== "" || source !== ALL || period !== ALL || stage !== ALL;
  function clearFilters() {
    setSearch("");
    setSource(ALL);
    setPeriod(ALL);
    setStage(ALL);
  }

  return (
    <PageBody>
      <PageHeader title="Lead Inbox" />
      <LeadSummary />
      <Panel
        id="all-leads"
        title="All leads"
        description="Every lead, newest first. Open one to see where it came from and manage it."
        actions={<LeadViewSwitch view="list" />}
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
            <FilterSelect
              label="Filter by date"
              allLabel="All time"
              value={period}
              options={DATE_OPTIONS}
              onChange={setPeriod}
              className={period !== ALL ? ACTIVE_FILTER_CLASS : undefined}
            />
            <FilterSelect
              label="Filter by pipeline stage"
              allLabel="All stages"
              value={stage}
              options={STAGE_OPTIONS}
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
        <DataTable
          caption="Leads"
          columns={COLUMNS}
          rows={rows}
          getRowId={(lead) => lead.id}
          rowHref={(lead) => withPeriod(`/leads/${lead.id}`)}
          defaultSort={{ columnId: "submitted", direction: "desc" }}
          emptyTitle="No leads match"
          emptyDescription="Try a different search, or clear a filter."
          bare
          footerSummary
        />
      </Panel>
    </PageBody>
  );
}
