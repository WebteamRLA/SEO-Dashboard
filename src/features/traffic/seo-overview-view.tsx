"use client";

import { BarChart3 } from "lucide-react";
import { ChartCard } from "@/components/charts/chart-card";
import { LineTrendChart, type ChartSeries } from "@/components/charts/charts";
import { DataTable, type Column } from "@/components/data/data-table";
import { EmptyState } from "@/components/data/empty-state";
import { MetricCard, MetricGrid } from "@/components/data/metric-card";
import { formatMonthShort, formatNumber, formatPercent } from "@/lib/format";
import type { LandingPage, MonthKey, SearchMetrics, TrafficMetrics } from "@/lib/types";
import { completeMonths } from "@/lib/month";
import { COMPLETE_MONTHS_NOTE, describeChange, findPrior, toChartData, toMonthTable } from "./trend";

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
  month,
  monthLabel,
  inProgressMonth,
  search,
  traffic,
  landingPages,
}: {
  month: MonthKey;
  monthLabel: string;
  /** True when the selected month is still in progress. */
  inProgressMonth: MonthKey;
  search: SearchMetrics[];
  traffic: TrafficMetrics[];
  landingPages: LandingPage[];
}) {
  const partial = month === inProgressMonth;
  const trend = completeMonths(search, inProgressMonth);
  const current = search.find((row) => row.month === month);
  const prior = findPrior(search, month);
  const currentTraffic = traffic.find((row) => row.month === month);
  const priorTraffic = findPrior(traffic, month);
  const priorLabel = prior ? formatMonthShort(prior.month) : "";
  // A part-month total compared with a full month would read as a collapse.
  const countDetail = (value: number | undefined, previous: number | undefined) =>
    partial ? "Month in progress" : value === undefined ? undefined : describeChange("percent", value, previous, priorLabel);

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
            detail={describeChange("points", current.ctr, prior?.ctr, priorLabel)}
          />
          <MetricCard
            label="Average position"
            value={current.position.toFixed(1)}
            detail={describeChange("position", current.position, prior?.position, priorLabel)}
          />
          <MetricCard
            label="Organic visitors"
            value={currentTraffic ? formatNumber(currentTraffic.organicVisitors) : "—"}
            detail={countDetail(currentTraffic?.organicVisitors, priorTraffic?.organicVisitors)}
          />
        </MetricGrid>
      ) : (
        <EmptyState icon={BarChart3} title={`No search data for ${monthLabel}`} />
      )}

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
          <p className="text-xs text-muted-foreground">Sample list. It does not change with the selected month.</p>
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
