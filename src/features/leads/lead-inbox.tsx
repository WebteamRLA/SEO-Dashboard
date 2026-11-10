"use client";

import { PeriodLink, usePeriodHref } from "@/components/layout/period-link";
import { useMemo, useState } from "react";
import { KanbanSquare } from "lucide-react";
import { DataTable, type Column } from "@/components/data/data-table";
import { ALL, FilterBar, FilterSelect } from "@/components/data/filter-select";
import { SearchInput } from "@/components/data/search-input";
import { StatusBadge } from "@/components/data/status-badge";
import { Button } from "@/components/ui/button";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { STAGE_META } from "@/lib/domain/leads";
import { formatDate } from "@/lib/format";
import { LEAD_SOURCES, PIPELINE_STAGES, type Lead } from "@/lib/types";
import { DATE_PRESETS, filterLeads } from "./lead-logic";
import { useLeads } from "./leads-store";
import { PreviewChangesNote } from "./preview-changes-note";
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
      <div className="flex min-w-0 flex-col items-start gap-1">
        <PeriodLink
          href={`/leads/${lead.id}`}
          onClick={(event) => event.stopPropagation()}
          className="rounded-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          {lead.name}
        </PeriodLink>
        {lead.spamFilteredBy ? <SpamTag by={lead.spamFilteredBy} /> : null}
      </div>
    ),
  },
  {
    id: "email",
    header: "Email",
    hideBelow: "md",
    sortValue: (lead) => lead.email,
    cell: (lead) => <span className="text-muted-foreground">{lead.email ?? "—"}</span>,
  },
  {
    id: "company",
    header: "Company",
    hideBelow: "xl",
    sortValue: (lead) => lead.company,
    // Older leads have only a company, which is then also the name; do not repeat it.
    cell: (lead) => <span className="text-muted-foreground">{lead.company && lead.company !== lead.name ? lead.company : "—"}</span>,
  },
  {
    id: "source",
    header: "Source",
    hideBelow: "lg",
    sortValue: (lead) => lead.attribution.source,
    cell: (lead) => lead.attribution.source,
  },
  {
    id: "heard-from",
    header: "Heard from",
    hideBelow: "xl",
    sortValue: (lead) => lead.attribution.heardFrom,
    cell: (lead) => <span className="text-muted-foreground">{lead.attribution.heardFrom ?? "—"}</span>,
  },
  {
    id: "submitted",
    header: "Submitted",
    hideBelow: "sm",
    sortValue: (lead) => lead.submittedAt,
    cell: (lead) => <span className="whitespace-nowrap">{lead.submittedAt ? formatDate(lead.submittedAt) : "No date"}</span>,
  },
  {
    id: "stage",
    header: "Lead stage",
    sortValue: (lead) => PIPELINE_STAGES.indexOf(lead.stage),
    cell: (lead) => <StatusBadge tone={STAGE_META[lead.stage].tone} label={STAGE_META[lead.stage].label} />,
  },
];

export function LeadInbox({ referenceDate }: { referenceDate: string }) {
  const { leads } = useLeads();
  const withPeriod = usePeriodHref();
  const [search, setSearch] = useState("");
  const [source, setSource] = useState(ALL);
  const [period, setPeriod] = useState(ALL);
  const [stage, setStage] = useState(ALL);

  const rows = useMemo(
    () => filterLeads(leads, { search, source, period, stage }, referenceDate),
    [leads, search, source, period, stage, referenceDate],
  );

  return (
    <PageBody>
      <PageHeader
        title="Lead Inbox"
        description="Every lead, newest first. Open a lead to see where it came from and manage it."
        actions={
          <Button variant="outline" asChild>
            <PeriodLink href="/leads/pipeline">
              <KanbanSquare aria-hidden />
              Pipeline
            </PeriodLink>
          </Button>
        }
      />
        <PreviewChangesNote />
        <FilterBar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, email or company" />
          <FilterSelect label="Filter by source" allLabel="All sources" value={source} options={SOURCE_OPTIONS} onChange={setSource} />
          <FilterSelect label="Filter by date" allLabel="All time" value={period} options={DATE_OPTIONS} onChange={setPeriod} />
          <FilterSelect label="Filter by pipeline stage" allLabel="All stages" value={stage} options={STAGE_OPTIONS} onChange={setStage} />
        </FilterBar>
        <DataTable
          caption="Leads"
          columns={COLUMNS}
          rows={rows}
          getRowId={(lead) => lead.id}
          rowHref={(lead) => withPeriod(`/leads/${lead.id}`)}
          defaultSort={{ columnId: "submitted", direction: "desc" }}
          emptyTitle="No leads match"
          emptyDescription="Try a different search, or clear a filter."
        />
    </PageBody>
  );
}
