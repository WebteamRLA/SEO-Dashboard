"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { RankedBars } from "@/components/charts/ranked-bars";
import { ExternalLink } from "@/components/data/external-link";
import { EmptyState } from "@/components/data/empty-state";
import { ALL, FilterSelect } from "@/components/data/filter-select";
import { MetricCard, MetricGrid } from "@/components/data/metric-card";
import { Panel } from "@/components/data/panel";
import { ProgressBar } from "@/components/data/progress-bar";
import { SearchInput } from "@/components/data/search-input";
import { StatusBadge, Tag } from "@/components/data/status-badge";
import { Button } from "@/components/ui/button";
import { toProgress } from "@/lib/domain/progress";
import { formatDate, formatNumber } from "@/lib/format";
import { TASK_STATUSES, type CategoryCount, type TaskCounts } from "@/lib/types";
import { filterTasks, STATUS_META, type TaskRow } from "./filter-tasks";

const STATUS_OPTIONS = TASK_STATUSES.map((value) => ({ value, label: STATUS_META[value].label }));

const byDue = (a: TaskRow, b: TaskRow) => a.dueDate.localeCompare(b.dueDate) || a.name.localeCompare(b.name);
const byCompletedDesc = (a: TaskRow, b: TaskRow) =>
  (b.completedDate ?? "").localeCompare(a.completedDate ?? "") || byDue(a, b);

type SortValue = string | number | null;
interface SortColumn {
  id: string;
  header: string;
  value: (row: TaskRow) => SortValue;
  hide?: string;
}

const SORT_COLUMNS: SortColumn[] = [
  { id: "name", header: "Task", value: (r) => r.name },
  { id: "category", header: "Category", value: (r) => r.category, hide: "hidden md:table-cell" },
  { id: "project", header: "Project", value: (r) => r.project, hide: "hidden lg:table-cell" },
  { id: "assignee", header: "Assigned to", value: (r) => r.assigneeName, hide: "hidden sm:table-cell" },
  { id: "due", header: "Due", value: (r) => r.dueDate, hide: "hidden md:table-cell" },
  { id: "status", header: "Status", value: (r) => TASK_STATUSES.indexOf(r.status) },
  { id: "completed", header: "Completed", value: (r) => r.completedDate, hide: "hidden xl:table-cell" },
];

interface SortState {
  columnId: string;
  direction: "asc" | "desc";
}

/** Nulls always sort last, whichever direction is active (same as DataTable). */
function compareValues(a: SortValue, b: SortValue): number {
  if (a === null) return b === null ? 0 : 1;
  if (b === null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

function sortRows(rows: TaskRow[], sort: SortState | null, fallback: (a: TaskRow, b: TaskRow) => number): TaskRow[] {
  const column = SORT_COLUMNS.find((c) => c.id === sort?.columnId);
  if (!column || !sort) return [...rows].sort(fallback);
  const factor = sort.direction === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const [x, y] = [column.value(a), column.value(b)];
    if (x === null || y === null) return compareValues(x, y);
    return compareValues(x, y) * factor;
  });
}

const OPEN_LIMIT = 25;
const COMPLETED_LIMIT = 10;

const TH = "h-10 px-5 text-left text-xs font-medium text-ink-quiet whitespace-nowrap";
const TD = "px-5 py-2.5 align-middle text-[13px] text-ink-body";

function GroupHeader({ name, count, span }: { name: string; count: number; span: number }) {
  return (
    <tr className="border-t border-line bg-surface-subtle">
      <th colSpan={span} scope="rowgroup" className="h-9 px-5 text-left">
        <span className="text-xs font-semibold tracking-[0.04em] text-ink-body uppercase">{name}</span>
        <span className="ml-2 text-xs font-normal text-ink-quiet tabular-nums">{count}</span>
      </th>
    </tr>
  );
}

function MoreRow({ total, limit, expanded, onToggle }: { total: number; limit: number; expanded: boolean; onToggle: () => void }) {
  if (total <= limit) return null;
  return (
    <tr className="border-t border-line-soft">
      <td colSpan={7} className="px-5 py-2">
        <button type="button" onClick={onToggle} aria-expanded={expanded} className="text-[13px] font-medium text-primary hover:underline">
          {expanded ? "Show fewer" : `Show all ${formatNumber(total)}`}
        </button>
      </td>
    </tr>
  );
}

function TaskLine({ row }: { row: TaskRow }) {
  const meta = STATUS_META[row.status];
  return (
    <tr className="border-t border-line-soft transition-colors hover:bg-surface-subtle">
      <td className="min-w-[260px] px-5 py-2.5 align-middle text-sm font-medium text-ink">
        <ExternalLink href={row.url} className="text-ink hover:text-primary">
          {row.name}
        </ExternalLink>
      </td>
      <td className={`${TD} hidden md:table-cell`}>
        <Tag>{row.category}</Tag>
      </td>
      <td className={`${TD} hidden lg:table-cell`}>{row.project}</td>
      <td className={`${TD} hidden sm:table-cell whitespace-nowrap`}>{row.assigneeName}</td>
      <td className={`${TD} hidden md:table-cell whitespace-nowrap tabular-nums`}>{formatDate(row.dueDate)}</td>
      <td className={TD}>
        <StatusBadge tone={meta.tone} label={meta.label} />
      </td>
      <td className={`${TD} hidden xl:table-cell whitespace-nowrap tabular-nums`}>{formatDate(row.completedDate)}</td>
    </tr>
  );
}

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

  const [sort, setSort] = useState<SortState | null>(null);
  const [showAllOpen, setShowAllOpen] = useState(false);
  const [showAllDone, setShowAllDone] = useState(false);

  const open = useMemo(
    () => sortRows(filtered.filter((row) => row.status !== "completed"), sort, byDue),
    [filtered, sort],
  );
  const done = useMemo(
    () => sortRows(filtered.filter((row) => row.status === "completed"), sort, byCompletedDesc),
    [filtered, sort],
  );
  const openShown = showAllOpen ? open : open.slice(0, OPEN_LIMIT);
  const doneShown = showAllDone ? done : done.slice(0, COMPLETED_LIMIT);

  function toggleSort(columnId: string) {
    setSort((current) =>
      current?.columnId === columnId
        ? { columnId, direction: current.direction === "asc" ? "desc" : "asc" }
        : { columnId, direction: "asc" },
    );
  }

  const completion = toProgress(counts.completed, counts.total);
  const isFiltered = query.trim() !== "" || status !== ALL || category !== ALL;
  const clear = () => {
    setQuery("");
    setStatus(ALL);
    setCategory(ALL);
  };

  return (
    <>
      <MetricGrid>
        <MetricCard
          tone="green"
          label="Completed"
          value={formatNumber(counts.completed)}
          suffix={`/${formatNumber(counts.total)}`}
          footer={<ProgressBar tone="good" label="Tasks completed" progress={completion} />}
          detail={`${completion.percent}% of tasks in this period`}
        />
        <MetricCard tone="blue" label="In progress" value={formatNumber(counts.inProgress)} detail="Being worked on now" />
        <MetricCard label="To do" value={formatNumber(counts.todo)} detail="Not started yet" />
      </MetricGrid>

      <Panel
        flush
        id="tasks"
        title="Tasks"
        description={`Live from Teamwork · ${periodText}`}
        toolbar={
          <div className="flex flex-col flex-wrap gap-2 sm:flex-row sm:items-center">
            <SearchInput value={query} onChange={setQuery} placeholder="Search tasks, projects, people" />
            <FilterSelect label="Filter by status" allLabel="All statuses" value={status} options={STATUS_OPTIONS} onChange={setStatus} />
            <FilterSelect label="Filter by category" allLabel="All categories" value={category} options={categoryOptions} onChange={setCategory} />
            {isFiltered ? (
              <Button type="button" variant="ghost" onClick={clear} className="text-primary">
                Clear filters
              </Button>
            ) : null}
            <span className="text-xs text-ink-quiet sm:ml-auto" aria-live="polite">
              Showing {formatNumber(filtered.length)} {filtered.length === 1 ? "task" : "tasks"}
            </span>
          </div>
        }
      >
        {filtered.length === 0 ? (
          <EmptyState
            title={rows.length === 0 ? "No tasks in this period" : "No tasks match"}
            description={
              rows.length === 0
                ? "Pick another period from the selector in the top bar."
                : "Try a different search, status, or category."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">SEO tasks, {periodText}</caption>
              <thead>
                <tr>
                  {SORT_COLUMNS.map((column) => {
                    const active = sort?.columnId === column.id;
                    const Icon = !active ? ChevronsUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;
                    return (
                      <th
                        key={column.id}
                        scope="col"
                        aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : undefined}
                        className={`${TH} ${column.hide ?? ""}`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleSort(column.id)}
                          className={`inline-flex items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring ${active ? "text-ink" : ""}`}
                        >
                          {column.header}
                          <Icon className="size-3.5" aria-hidden />
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              {open.length > 0 ? (
                <tbody>
                  <GroupHeader name="Open" count={open.length} span={7} />
                  {openShown.map((row) => (
                    <TaskLine key={row.id} row={row} />
                  ))}
                  <MoreRow total={open.length} limit={OPEN_LIMIT} expanded={showAllOpen} onToggle={() => setShowAllOpen((v) => !v)} />
                </tbody>
              ) : null}
              {done.length > 0 ? (
                <tbody>
                  <GroupHeader name="Completed" count={done.length} span={7} />
                  {doneShown.map((row) => (
                    <TaskLine key={row.id} row={row} />
                  ))}
                  <MoreRow total={done.length} limit={COMPLETED_LIMIT} expanded={showAllDone} onToggle={() => setShowAllDone((v) => !v)} />
                </tbody>
              ) : null}
            </table>
          </div>
        )}
      </Panel>

      {byCategory.length > 0 ? (
        <Panel title="Tasks by category" description="How much of each kind of work is done">
          <RankedBars
            label="Tasks by category"
            rows={byCategory.map((row) => ({
              label: row.category,
              value: row.total,
              display: `${row.completed} of ${row.total} done`,
            }))}
          />
        </Panel>
      ) : null}
    </>
  );
}
