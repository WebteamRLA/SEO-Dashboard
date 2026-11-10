"use client";

import { BarChart3 } from "lucide-react";
import { ChartCard } from "@/components/charts/chart-card";
import { LineTrendChart, type ChartSeries } from "@/components/charts/charts";
import { DataTable, type Column } from "@/components/data/data-table";
import { EmptyState } from "@/components/data/empty-state";
import { MetricCard, MetricGrid } from "@/components/data/metric-card";
import { formatNumber, formatPercent } from "@/lib/format";
import { monthsInRange, previousRange, type DateRange } from "@/lib/date-range";
import type { LandingPage, MonthKey, SearchMetrics, TrafficMetrics } from "@/lib/types";
import { completeMonths } from "@/lib/month";
import { aggregateSearch, aggregateTraffic, PRIOR_LABEL, roundingNote } from "./aggregate";
import { COMPLETE_MONTHS_NOTE, describeChange, toChartData, toMonthTable } from "./trend";

const CLICK_SERIES: ChartSeries[] = [{ key: "clicks", label: "Organic clicks", slot: 1 }];

const COLUMNS: Column<LandingPage>[] = [
  { id: "url", header: "Page", cell: (row) => <span className="font-medium break-all">{row.url}</span>, sortValue: (row) => row.url },
  { id: "clicks", header: "Clicks", align: "right", cell: (row) => formatNumber(row.clicks), sortValue: (row) => row.clicks },
  {
    id: "impressions",
    header: "Impressions",
    align: "right",
    hideBelow: "md",
    cell: (row) => formatNumber(row.impressions),
    sortValue: (row) => row.impressions,
  },
  {
    id: "visitors",
    header: "Organic visitors",
    align: "right",
    hideBelow: "sm",
    cell: (row) => formatNumber(row.organicVisitors),
    sortValue: (row) => row.organicVisitors,
  },
];

export function SeoOverviewView({
  range,
  periodText,
  inProgressMonth,
  search,
  traffic,
  landingPages,
}: {
  range: DateRange;
  periodText: string;
  /** The month still in progress; a period that includes it is partial. */
  inProgressMonth: MonthKey;
  search: SearchMetrics[];
  traffic: TrafficMetrics[];
  landingPages: LandingPage[];
}) {
  const months = monthsInRange(range);
  const priorMonths = monthsInRange(previousRange(range));
  const partial = months.includes(inProgressMonth);
  const trend = completeMonths(search, inProgressMonth);
  const current = aggregateSearch(search, months);
  const prior = aggregateSearch(search, priorMonths);
  const currentTraffic = aggregateTraffic(traffic, months);
  const priorTraffic = aggregateTraffic(traffic, priorMonths);
  // A part-month total compared with a full month would read as a collapse.
  const countDetail = (value: number | undefined, previous: number | undefined) =>
    partial ? "Includes the current month" : value === undefined ? undefined : describeChange("percent", value, previous, PRIOR_LABEL);

  return (
    <>
      {current ? (
        <MetricGrid className="xl:grid-cols-5">
          <MetricCard
            label="Organic clicks"
            value={formatNumber(current.clicks)}
            detail={countDetail(current.clicks, prior?.clicks)}
          />
          <MetricCard
            label="Impressions"
            value={formatNumber(current.impressions)}
            detail={countDetail(current.impressions, prior?.impressions)}
          />
          <MetricCard
            label="Average CTR"
            value={formatPercent(current.ctr, 1)}
            detail={describeChange("points", current.ctr, prior?.ctr, PRIOR_LABEL)}
          />
          <MetricCard
            label="Average position"
            value={current.position.toFixed(1)}
            detail={describeChange("position", current.position, prior?.position, PRIOR_LABEL)}
          />
          <MetricCard
            label="Organic visitors"
            value={currentTraffic ? formatNumber(currentTraffic.organicVisitors) : "—"}
            detail={countDetail(currentTraffic?.organicVisitors, priorTraffic?.organicVisitors)}
          />
        </MetricGrid>
      ) : (
        <EmptyState icon={BarChart3} title={`No search data for ${periodText}`} />
      )}
      <p className="text-xs text-muted-foreground">{roundingNote(months)}</p>

      <ChartCard
        title="Organic clicks over time"
        description={COMPLETE_MONTHS_NOTE}
        table={toMonthTable(trend, "Organic clicks", (row) => formatNumber(row.clicks))}
      >
        <LineTrendChart area data={toChartData(trend, (row) => ({ clicks: row.clicks }))} series={CLICK_SERIES} />
      </ChartCard>

      <section className="flex flex-col gap-2">
        <div>
          <h2 className="text-sm font-semibold">Top landing pages</h2>
          <p className="text-xs text-muted-foreground">Sample list. It does not change with the selected period.</p>
        </div>
        <DataTable
          caption="Top landing pages"
          columns={COLUMNS}
          rows={landingPages}
          getRowId={(row) => row.url}
          defaultSort={{ columnId: "clicks", direction: "desc" }}
        />
      </section>
    </>
  );
}
