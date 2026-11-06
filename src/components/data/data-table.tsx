"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-state";

export interface Column<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Providing this makes the column sortable. */
  sortValue?: (row: T) => string | number | null;
  align?: "left" | "right";
  /** Hide low-priority columns on narrow screens. */
  hideBelow?: "sm" | "md" | "lg" | "xl";
}

export interface SortState {
  columnId: string;
  direction: "asc" | "desc";
}

const HIDE_CLASS = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
} as const;

function compare(a: string | number | null, b: string | number | null): number {
  // Nulls always sort last, whichever direction is active.
  if (a === null) return b === null ? 0 : 1;
  if (b === null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

/**
 * Sortable, paginated table. Filtering belongs to the caller: pass the rows
 * that survive it. Pagination returns to page 1 whenever `rows` changes.
 *
 * With `rowHref`, make a cell in each row a real `<Link>` too, so the
 * destination is reachable by keyboard and screen reader.
 */
export function DataTable<T>({
  caption,
  columns,
  rows,
  getRowId,
  rowHref,
  defaultSort,
  pageSize = 10,
  emptyTitle = "No results",
  emptyDescription = "Try changing the search or filters.",
}: {
  /** Accessible description of the table's contents. */
  caption: string;
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  rowHref?: (row: T) => string;
  defaultSort?: SortState;
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<SortState | null>(defaultSort ?? null);
  const [page, setPage] = useState(1);
  const [previousRows, setPreviousRows] = useState(rows);

  if (rows !== previousRows) {
    setPreviousRows(rows);
    setPage(1);
  }

  const sortColumn = columns.find((column) => column.id === sort?.columnId);
  const sorted = (() => {
    const getValue = sortColumn?.sortValue;
    if (!getValue) return rows;
    const factor = sort?.direction === "desc" ? -1 : 1;
    return [...rows].sort((a, b) => {
      const [valueA, valueB] = [getValue(a), getValue(b)];
      if (valueA === null || valueB === null) return compare(valueA, valueB);
      return compare(valueA, valueB) * factor;
    });
  })();

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageRows = sorted.slice(start, start + pageSize);

  function toggleSort(columnId: string) {
    setSort((current) =>
      current?.columnId === columnId
        ? { columnId, direction: current.direction === "asc" ? "desc" : "asc" }
        : { columnId, direction: "asc" },
    );
    setPage(1);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {rows.length === 0 ? (
        <EmptyState icon={SearchX} title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <caption className="sr-only">{caption}</caption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {columns.map((column) => {
                    const active = sort?.columnId === column.id;
                    const Icon = !active ? ChevronsUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;
                    return (
                      <TableHead
                        key={column.id}
                        scope="col"
                        aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : undefined}
                        className={cn(
                          "h-10 text-xs font-medium text-muted-foreground",
                          column.align === "right" && "text-right",
                          column.hideBelow && HIDE_CLASS[column.hideBelow],
                        )}
                      >
                        {column.sortValue ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(column.id)}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                              column.align === "right" && "flex-row-reverse",
                              active && "text-foreground",
                            )}
                          >
                            {column.header}
                            <Icon className="size-3.5" aria-hidden />
                          </button>
                        ) : (
                          column.header
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((row) => {
                  const href = rowHref?.(row);
                  return (
                    <TableRow
                      key={getRowId(row)}
                      onClick={href ? () => router.push(href) : undefined}
                      className={href ? "cursor-pointer" : undefined}
                    >
                      {columns.map((column) => (
                        <TableCell
                          key={column.id}
                          className={cn(
                            "py-2.5",
                            column.align === "right" && "text-right",
                            column.hideBelow && HIDE_CLASS[column.hideBelow],
                          )}
                        >
                          {column.cell(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {sorted.length > pageSize ? (
            <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2">
              <p className="text-xs text-muted-foreground" aria-live="polite">
                Showing {start + 1}–{start + pageRows.length} of {sorted.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-4" aria-hidden />
                </Button>
                <span className="px-2 text-xs text-muted-foreground">
                  Page {currentPage} of {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage === pageCount}
                  aria-label="Next page"
                >
                  <ChevronRight className="size-4" aria-hidden />
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
