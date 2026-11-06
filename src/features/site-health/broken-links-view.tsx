"use client";

import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/data/data-table";
import { FilterBar, FilterSelect, ALL } from "@/components/data/filter-select";
import { SearchInput } from "@/components/data/search-input";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDate } from "@/lib/format";
import type { BrokenLink } from "@/lib/types";
import { LINK_ISSUE_META, LINK_ISSUE_STATUSES } from "./site-health-meta";

const STATUS_OPTIONS = LINK_ISSUE_STATUSES.map((value) => ({ value, label: LINK_ISSUE_META[value].label }));

const COLUMNS: Column<BrokenLink>[] = [
  {
    id: "url",
    header: "URL",
    cell: (link) => <span className="font-medium break-all">{link.url}</span>,
    sortValue: (link) => link.url,
  },
  {
    id: "foundOn",
    header: "Found on",
    hideBelow: "sm",
    cell: (link) => <span className="break-all text-muted-foreground">{link.foundOn}</span>,
    sortValue: (link) => link.foundOn,
  },
  {
    id: "statusCode",
    header: "Status code",
    cell: (link) => link.statusCode,
    sortValue: (link) => link.statusCode,
  },
  {
    id: "firstDetected",
    header: "First detected",
    hideBelow: "md",
    cell: (link) => formatDate(link.firstDetected),
    sortValue: (link) => link.firstDetected,
  },
  {
    id: "lastChecked",
    header: "Last checked",
    hideBelow: "md",
    cell: (link) => formatDate(link.lastChecked),
    sortValue: (link) => link.lastChecked,
  },
  {
    id: "status",
    header: "Issue status",
    cell: (link) => {
      const meta = LINK_ISSUE_META[link.status];
      return <StatusBadge tone={meta.tone} label={meta.label} />;
    },
    sortValue: (link) => LINK_ISSUE_META[link.status].rank,
  },
];

export function BrokenLinksView({ links }: { links: BrokenLink[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(ALL);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return links.filter(
      (link) =>
        (status === ALL || link.status === status) &&
        (needle === "" || link.url.toLowerCase().includes(needle)),
    );
  }, [links, query, status]);

  return (
    <>
      <FilterBar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search by URL" />
        <FilterSelect
          label="Filter by status"
          allLabel="All statuses"
          value={status}
          options={STATUS_OPTIONS}
          onChange={setStatus}
        />
      </FilterBar>

      <DataTable
        caption="Broken links found on the site, with their issue status"
        columns={COLUMNS}
        rows={filtered}
        getRowId={(link) => link.id}
        defaultSort={{ columnId: "status", direction: "asc" }}
        emptyTitle={links.length === 0 ? "No broken links" : "No links match"}
        emptyDescription={
          links.length === 0
            ? "No broken links are recorded in the sample data."
            : "Try a different search or status."
        }
      />
    </>
  );
}
