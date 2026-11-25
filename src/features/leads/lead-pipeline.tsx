"use client";

import { PeriodLink } from "@/components/layout/period-link";
import { useMemo, useState } from "react";
import { CalendarDays, ExternalLink } from "lucide-react";
import { ALL, FilterSelect } from "@/components/data/filter-select";
import { Panel } from "@/components/data/panel";
import { SearchInput } from "@/components/data/search-input";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { formatDate } from "@/lib/format";
import { LEAD_SOURCES, type Lead, type PipelineColumn } from "@/lib/types";
import { LeadDrawer, openLeadOnClick } from "./lead-drawer";
import type { DateRange } from "@/lib/date-range";
import { filterLeads } from "./lead-logic";
import { LeadSummary } from "./lead-summary";
import { ACTIVE_FILTER_CLASS, ClearFiltersButton, LeadViewSwitch, plural, SourceIcon } from "./lead-ui";
import { useLeads } from "./leads-store";
import { PipelineUnavailable } from "./pipeline-unavailable";
import { SyncButton } from "./sync-button";

const SOURCE_OPTIONS = LEAD_SOURCES.map((source) => ({ value: source, label: source }));

/**
 * The Teamwork Pipeline board, read-only: Teamwork's own columns in Teamwork's
 * order and colours. Cards move in Teamwork; Sync pulls the latest board. Like
 * the list, it follows the topbar date range: only cards added in `range` show.
 */
export function LeadPipeline({ range, periodText }: { range: DateRange; periodText: string }) {
  const { leads, columns, error } = useLeads();
  const [search, setSearch] = useState("");
  const [source, setSource] = useState(ALL);

  // The period, search and source narrow what the board shows.
  const visible = useMemo(
    () => filterLeads(leads, { search, source, range, stage: ALL }),
    [leads, search, source, range],
  );
  const byColumn = useMemo(() => {
    const groups = new Map<number, Lead[]>(columns.map((column) => [column.id, []]));
    for (const lead of visible) {
      const id = lead.teamwork?.column.id ?? 0;
      groups.set(id, [...(groups.get(id) ?? []), lead]);
    }
    return groups;
  }, [columns, visible]);
  const filtered = search.trim() !== "" || source !== ALL;

  return (
    <PageBody>
      <PageHeader title="Lead Pipeline" />
      <LeadSummary range={range} periodText={periodText} />
      <Panel
        id="all-leads"
        title="All leads"
        description={`Cards added to the Teamwork Pipeline board in this period (${periodText}). Cards move in Teamwork; Sync pulls the latest.`}
        actions={
          <>
            <SyncButton />
            <LeadViewSwitch view="pipeline" />
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
            {filtered ? (
              <ClearFiltersButton
                onClick={() => {
                  setSearch("");
                  setSource(ALL);
                }}
              />
            ) : null}
            <span className="text-xs text-ink-quiet sm:ml-auto">{plural(visible.length, "lead")}</span>
          </div>
        }
      >
        {error ? (
          <PipelineUnavailable message={error} />
        ) : (
          <div
            role="region"
            aria-label="Pipeline, scroll sideways for more columns"
            tabIndex={0}
            // Sideways only: columns scroll on their own, so the board itself never scrolls up and leaves a gap.
            className="scroll-thin relative overflow-x-auto overflow-y-hidden rounded-b-xl px-5 pt-4 pb-5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <div className="flex w-max items-start gap-4">
              {columns.map((column) => (
                <BoardColumn key={column.id} column={column} leads={byColumn.get(column.id) ?? []} />
              ))}
            </div>
          </div>
        )}
      </Panel>
      <LeadDrawer />
    </PageBody>
  );
}

function BoardColumn({ column, leads }: { column: PipelineColumn; leads: Lead[] }) {
  const headingId = `column-${column.id}`;
  return (
    <section
      aria-labelledby={headingId}
      className="flex max-h-[calc(100dvh-12rem)] min-h-40 w-[288px] shrink-0 flex-col gap-2 rounded-xl border border-border bg-[#F9FAFB] p-2.5"
    >
      <header className="flex items-center gap-2 px-0.5 pt-0.5 pb-1">
        <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: column.color }} />
        <h3 id={headingId} className="min-w-0 truncate text-[13px] font-semibold text-ink" title={column.name}>
          {column.name}
        </h3>
        <span className="ml-auto text-xs font-semibold text-ink-body tabular-nums">
          {leads.length}
          <span className="sr-only"> {leads.length === 1 ? "lead" : "leads"}</span>
        </span>
      </header>
      {/* `relative` keeps the cards' screen-reader text inside this scrolling list; without it that text stretches the whole board. */}
      <ul className="scroll-thin relative -mx-1 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-1 pb-0.5">
        {leads.length === 0 ? (
          <li className="px-1 py-3.5 text-center text-xs text-ink-quiet">No leads in this column</li>
        ) : (
          leads.map((lead) => (
            <li key={lead.id}>
              <LeadCard lead={lead} />
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

function LeadCard({ lead }: { lead: Lead }) {
  const info = lead.teamwork;
  return (
    // The name link stretches over the whole card, so a click anywhere opens the lead; the Teamwork link sits above it.
    <article className="group relative flex flex-col gap-1.5 rounded-[10px] border border-input bg-card px-3 py-2.5 transition-colors hover:border-[#C9CED6] hover:bg-[#FCFCFD]">
      <div className="flex items-start gap-1.5">
        <div className="flex min-w-0 flex-1 flex-col leading-[1.35]">
          <PeriodLink
            href={`/leads/${lead.id}`}
            onClick={openLeadOnClick(lead.id)}
            className="w-fit max-w-full truncate text-[13px] font-semibold text-ink outline-none group-hover:text-primary after:absolute after:inset-0 after:rounded-[10px] focus-visible:after:ring-2 focus-visible:after:ring-ring"
          >
            {lead.name}
          </PeriodLink>
          {lead.company ? <p className="truncate text-xs text-ink-quiet">{lead.company}</p> : null}
        </div>
        {info ? (
          <a
            href={info.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${lead.name} in Teamwork (new tab)`}
            className="relative z-10 -mt-0.5 -mr-1 flex size-6 shrink-0 items-center justify-center rounded-md text-[#9CA3AF] outline-none hover:bg-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        ) : null}
      </div>
      {info && info.tags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <SourceIcon source={lead.attribution.source} />
          {info.tags.map((tag) => (
            <span key={tag} className="inline-flex h-5 items-center rounded-md bg-tone-neutral-bg px-1.5 text-[11px] font-medium text-ink-body">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      {info && (info.assignees.length > 0 || info.dueDate) ? (
        <div className="flex items-center justify-between gap-2 text-[11px] text-ink-quiet">
          <span className="min-w-0 truncate">{info.assignees.join(", ")}</span>
          {info.dueDate ? (
            <span className="flex shrink-0 items-center gap-1 tabular-nums">
              <CalendarDays className="size-3" aria-hidden />
              <span className="sr-only">Due </span>
              {formatDate(info.dueDate)}
            </span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
