"use client";

import { useState, type ReactNode } from "react";
import { BarChart3, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface ChartTableData {
  columns: string[];
  rows: { key: string; cells: string[] }[];
}

/**
 * Frames a chart with a title and a table toggle. Some palette slots sit under
 * 3:1 contrast, so `table` is required: no value depends on seeing the colour.
 */
export function ChartCard({
  title,
  description,
  table,
  children,
  className,
}: {
  title: string;
  description?: string;
  table: ChartTableData;
  children: ReactNode;
  className?: string;
}) {
  const [showTable, setShowTable] = useState(false);

  return (
    <section className={cn("flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setShowTable((value) => !value)}
          aria-pressed={showTable}
          aria-label={showTable ? `Show ${title} as a chart` : `Show ${title} as a table`}
        >
          {showTable ? <BarChart3 className="size-4" aria-hidden /> : <Table2 className="size-4" aria-hidden />}
        </Button>
      </div>
      {showTable ? (
        <div className="max-h-72 overflow-auto">
          <Table>
            <caption className="sr-only">{title}</caption>
            <TableHeader>
              <TableRow>
                {table.columns.map((column, index) => (
                  <TableHead key={column} scope="col" className={cn("text-xs", index > 0 && "text-right")}>
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.rows.map((row) => (
                <TableRow key={row.key}>
                  {row.cells.map((cell, index) => (
                    <TableCell key={index} className={cn("py-1.5", index > 0 && "text-right")}>
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        children
      )}
    </section>
  );
}
