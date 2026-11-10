"use client";

import { useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import { RankedBars } from "@/components/charts/ranked-bars";
import { DataTable, type Column } from "@/components/data/data-table";
import { FilterBar, FilterSelect, ALL } from "@/components/data/filter-select";
import { MetricCard, MetricGrid } from "@/components/data/metric-card";
import { SearchInput } from "@/components/data/search-input";
import { StatusBadge } from "@/components/data/status-badge";
import { TASK_STATUSES, type CategoryCount, type TaskCounts } from "@/lib/types";
import { formatDate, formatNumber } from "@/lib/format";
import { filterTasks, STATUS_META, type TaskRow } from "./filter-tasks";

const STATUS_OPTIONS = TASK_STATUSES.map((value) => ({ value, label: STATUS_META[value].label }));

const COLUMNS: Column<TaskRow>[] = [
  {
    id: "name",
    header: "Task",
    cell: (row) => <span className="font-medium">{row.name}</span>,
    sortValue: (row) => row.name,
  },
  { id: "category", header: "Category", cell: (row) => row.category, sortValue: (row) => row.category, hideBelow: "md" },
  { id: "project", header: "Project", cell: (row) => row.project, sortValue: (row) => row.project, hideBelow: "lg" },
  { id: "assignee", header: "Assigned to", cell: (row) => row.assigneeName, sortValue: (row) => row.assigneeName, hideBelow: "sm" },
  {
    id: "status",
    header: "Status",
    cell: (row) => <StatusBadge tone={STATUS_META[row.status].tone} label={STATUS_META[row.status].label} />,
    sortValue: (row) => TASK_STATUSES.indexOf(row.status),
  },
  { id: "due", header: "Due", cell: (row) => formatDate(row.dueDate), sortValue: (row) => row.dueDate, hideBelow: "md" },
  {
    id: "completed",
    header: "Completed",
    cell: (row) => formatDate(row.completedDate),
    sortValue: (row) => row.completedDate,
    hideBelow: "xl",
  },
];

export function WorkTracker({
  rows,
  counts,
  byCategory,
  periodText,
}: {
  rows: TaskRow[];
  counts: TaskCounts;
  byCategory: CategoryCount[];
  periodText: string;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(ALL);
  const [category, setCategory] = useState(ALL);

  // Categories come from the data, so the filter matches the real task lists.
  const categoryOptions = useMemo(() => {
    const names = [...new Set(rows.map((row) => row.category))].sort((a, b) => a.localeCompare(b));
    return names.map((value) => ({ value, label: value }));
  }, [rows]);

  const filtered = useMemo(
    () => filterTasks(rows, { query, status, category }),
    [rows, query, status, category],
  );

  return (
    <>
      <MetricGrid>
        <MetricCard label="Total tasks" value={formatNumber(counts.total)} icon={ClipboardList} />
        <MetricCard label="To do" value={formatNumber(counts.todo)} />
        <MetricCard label="In progress" value={formatNumber(counts.inProgress)} />
        <MetricCard label="Completed" value={formatNumber(counts.completed)} />
      </MetricGrid>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Tasks by category</h2>
        <RankedBars
          label="Tasks by category"
          rows={byCategory.map((row) => ({
            label: row.category,
            value: row.total,
            display: `${row.completed} of ${row.total} done`,
          }))}
        />
      </section>

      <FilterBar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search tasks, projects, people" />
        <FilterSelect label="Filter by status" allLabel="All statuses" value={status} options={STATUS_OPTIONS} onChange={setStatus} />
        <FilterSelect label="Filter by category" allLabel="All categories" value={category} options={categoryOptions} onChange={setCategory} />
      </FilterBar>

      <DataTable
        caption={`SEO tasks, ${periodText}`}
        columns={COLUMNS}
        rows={filtered}
        getRowId={(row) => row.id}
        defaultSort={{ columnId: "due", direction: "asc" }}
        emptyTitle={rows.length === 0 ? `No tasks in this period` : "No tasks match"}
        emptyDescription={
          rows.length === 0
            ? "Pick another period from the selector in the top bar."
            : "Try a different search, status, or category."
        }
      />
    </>
  );
}
