"use client";

import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/data/data-table";
import { FilterBar, FilterSelect, ALL, type FilterOption } from "@/components/data/filter-select";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDate } from "@/lib/format";
import type { SiteIssue } from "@/lib/types";
import { LINK_ISSUE_META, LINK_ISSUE_STATUSES, SEVERITIES, SEVERITY_META } from "./site-health-meta";

const SEVERITY_OPTIONS: FilterOption[] = SEVERITIES.map((value) => ({ value, label: SEVERITY_META[value].label }));
const STATUS_OPTIONS: FilterOption[] = LINK_ISSUE_STATUSES.map((value) => ({
  value,
  label: LINK_ISSUE_META[value].label,
}));

const COLUMNS: Column<SiteIssue>[] = [
  {
    id: "name",
    header: "Issue",
    cell: (issue) => <span className="font-medium">{issue.name}</span>,
    sortValue: (issue) => issue.name,
  },
  {
    id: "url",
    header: "URL",
    hideBelow: "md",
    cell: (issue) => <span className="break-all text-muted-foreground">{issue.url}</span>,
    sortValue: (issue) => issue.url,
  },
  {
    id: "severity",
    header: "Severity",
    cell: (issue) => {
      const meta = SEVERITY_META[issue.severity];
      return <StatusBadge tone={meta.tone} label={meta.label} />;
    },
    // Numeric rank, so critical sorts first rather than alphabetically.
    sortValue: (issue) => SEVERITY_META[issue.severity].rank,
  },
  {
    id: "detected",
    header: "Detected",
    hideBelow: "sm",
    cell: (issue) => formatDate(issue.detected),
    sortValue: (issue) => issue.detected,
  },
  {
    id: "status",
    header: "Current status",
    cell: (issue) => {
      const meta = LINK_ISSUE_META[issue.status];
      return <StatusBadge tone={meta.tone} label={meta.label} />;
    },
    sortValue: (issue) => LINK_ISSUE_META[issue.status].rank,
  },
];

export function IssueLogView({ issues }: { issues: SiteIssue[] }) {
  const [severity, setSeverity] = useState(ALL);
  const [status, setStatus] = useState(ALL);

  const filtered = useMemo(
    () =>
      issues.filter(
        (issue) =>
          (severity === ALL || issue.severity === severity) &&
          (status === ALL || issue.status === status),
      ),
    [issues, severity, status],
  );

  return (
    <>
      <FilterBar>
        <FilterSelect
          label="Filter by severity"
          allLabel="All severities"
          value={severity}
          options={SEVERITY_OPTIONS}
          onChange={setSeverity}
        />
        <FilterSelect
          label="Filter by status"
          allLabel="All statuses"
          value={status}
          options={STATUS_OPTIONS}
          onChange={setStatus}
        />
      </FilterBar>

      <DataTable
        caption="Logged site issues, with severity and current status"
        columns={COLUMNS}
        rows={filtered}
        getRowId={(issue) => issue.id}
        defaultSort={{ columnId: "severity", direction: "asc" }}
        emptyTitle={issues.length === 0 ? "No issues logged" : "No issues match"}
        emptyDescription={
          issues.length === 0
            ? "No site issues are recorded in the sample data."
            : "Try a different severity or status."
        }
      />
    </>
  );
}
