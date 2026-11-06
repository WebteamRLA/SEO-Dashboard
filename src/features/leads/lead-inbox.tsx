"use client";

import { MonthLink, useMonthHref } from "@/components/layout/month-link";
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
        <MonthLink
          href={`/leads/${lead.id}`}
          onClick={(event) => event.stopPropagation()}
          className="rounded-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          {lead.name}
        </MonthLink>
        {lead.spamFilteredBy ? <SpamTag by={lead.spamFilteredBy} /> : null}
      </div>
    ),
  },
  {
    id: "email",
    header: "Email",
    hideBelow: "md",
    sortValue: (lead) => lead.email,
    cell: (lead) => <span className="text-muted-foreground">{lead.email}</span>,
  },
  {
    id: "phone",
    header: "Phone",
    hideBelow: "xl",
    cell: (lead) => <span className="whitespace-nowrap text-muted-foreground">{lead.phone || "—"}</span>,
  },
  {
    id: "source",
    header: "Source",
    hideBelow: "lg",
    sortValue: (lead) => lead.attribution.source,
    cell: (lead) => lead.attribution.source,
  },
  {
    id: "page",
    header: "Website page",
    hideBelow: "xl",
    sortValue: (lead) => lead.pageUrl,
    cell: (lead) => <span className="text-muted-foreground">{lead.pageUrl}</span>,
  },
  {
    id: "submitted",
    header: "Submitted",
    hideBelow: "sm",
    sortValue: (lead) => lead.submittedAt,
    cell: (lead) => <span className="whitespace-nowrap">{formatDate(lead.submittedAt)}</span>,
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
  const withMonth = useMonthHref();
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
        description="Every form submission, newest first. Open a lead to see where it came from and manage it."
        actions={
          <Button variant="outline" asChild>
            <MonthLink href="/leads/pipeline">
              <KanbanSquare aria-hidden />
              Pipeline
            </MonthLink>
          </Button>
        }
      />
        <FilterBar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, email or company" />
          <FilterSelect label="Filter by source" allLabel="All sources" value={source} options={SOURCE_OPTIONS} onChange={setSource} />
          <FilterSelect label="Filter by date" allLabel="All time" value={period} options={DATE_OPTIONS} onChange={setPeriod} />
          <FilterSelect label="Filter by pipeline stage" allLabel="All stages" value={stage} options={STAGE_OPTIONS} onChange={setStage} />
        </FilterBar>
        <DataTable
          caption="Leads from website forms"
          columns={COLUMNS}
          rows={rows}
          getRowId={(lead) => lead.id}
          rowHref={(lead) => withMonth(`/leads/${lead.id}`)}
          defaultSort={{ columnId: "submitted", direction: "desc" }}
          emptyTitle="No leads match"
          emptyDescription="Try a different search, or clear a filter."
        />
    </PageBody>
  );
}
