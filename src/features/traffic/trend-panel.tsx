"use client";

import { useState, type ReactNode } from "react";
import { BarChart3, Table2 } from "lucide-react";
import type { ChartTableData } from "@/components/charts/chart-card";
import { ColumnChart, type ColumnDatum } from "@/components/charts/column-chart";
import type { ChartDatum, ChartSeries } from "@/components/charts/charts";
import { BarTrendChart, LineTrendChart } from "@/components/charts/lazy-charts";
import { Panel } from "@/components/data/panel";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** Up to this many buckets are drawn as the design's labelled columns; longer daily runs stay on recharts. */
export const MAX_COLUMNS = 31;

/**
 * A chart in the design's panel: title and context on the left, optional controls
 * (a metric toggle, a legend) and a table toggle on the right. The table is the
 * text alternative, so no value depends on seeing the chart.
 */
export function TrendPanel({
  title,
  description,
  actions,
  table,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  table: ChartTableData;
  children: ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <Panel
      title={title}
      description={description}
      flush={showTable}
      actions={
        <>
          {actions}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowTable((value) => !value)}
            aria-pressed={showTable}
            aria-label={showTable ? `Show ${title} as a chart` : `Show ${title} as a table`}
          >
            {showTable ? <BarChart3 className="size-4" aria-hidden /> : <Table2 className="size-4" aria-hidden />}
          </Button>
        </>
      }
    >
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
    </Panel>
  );
}

/** Column chart for few buckets, recharts bars for many daily ones. `columns` and `data` describe the same series. */
export function VolumeChart({
  label,
  columns,
  data,
  series,
  stacked,
  format,
}: {
  label: string;
  columns: ColumnDatum[];
  data: ChartDatum[];
  series: ChartSeries[];
  stacked?: boolean;
  format?: (value: number) => string;
}) {
  if (columns.length <= MAX_COLUMNS) return <ColumnChart label={label} data={columns} height={190} formatValue={format} />;
  return <BarTrendChart data={data} series={series} stacked={stacked} height={220} format={format} />;
}

export { LineTrendChart };
