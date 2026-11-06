"use client";

import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { ChartCard } from "@/components/charts/chart-card";
import { LineTrendChart, type ChartSeries } from "@/components/charts/charts";
import { DataTable, type Column } from "@/components/data/data-table";
import { EmptyState } from "@/components/data/empty-state";
import { MetricCard, MetricGrid } from "@/components/data/metric-card";
import { SearchInput } from "@/components/data/search-input";
import { formatMonthShort, formatNumber, formatPercent } from "@/lib/format";
import type { KeywordPerformance, MonthKey, SearchMetrics } from "@/lib/types";
import { completeMonths } from "@/lib/month";
import { COMPLETE_MONTHS_NOTE, describeChange, findPrior, toChartData, toMonthTable } from "./trend";

const CLICKS: ChartSeries[] = [{ key: "clicks", label: "Search clicks", slot: 1 }];
const IMPRESSIONS: ChartSeries[] = [{ key: "impressions", label: "Impressions", slot: 1 }];
const CTR: ChartSeries[] = [{ key: "ctr", label: "CTR", slot: 1 }];
const POSITION: ChartSeries[] = [{ key: "position", label: "Average position", slot: 1 }];

function changeText(change: number): string {
  if (change === 0) return "No change";
  return `${change > 0 ? "Improved" : "Worsened"} ${Math.abs(change).toFixed(1)}`;
}

const COLUMNS: Column<KeywordPerformance>[] = [
  { id: "keyword", header: "Keyword", cell: (row) => <span className="font-medium">{row.keyword}</span>, sortValue: (row) => row.keyword },
  { id: "clicks", header: "Clicks", align: "right", cell: (row) => formatNumber(row.clicks), sortValue: (row) => row.clicks },
  {
    id: "impressions",
    header: "Impressions",
    align: "right",
    hideBelow: "md",
    cell: (row) => formatNumber(row.impressions),
    sortValue: (row) => row.impressions,
  },
  { id: "ctr", header: "CTR", align: "right", hideBelow: "sm", cell: (row) => formatPercent(row.ctr, 1), sortValue: (row) => row.ctr },
  { id: "position", header: "Position", align: "right", cell: (row) => row.position.toFixed(1), sortValue: (row) => row.position },
  { id: "change", header: "Position change", align: "right", hideBelow: "lg", cell: (row) => changeText(row.change), sortValue: (row) => row.change },
];

export function SearchPerformanceView({
  month,
  monthLabel,
  inProgressMonth,
  search,
  keywords,
}: {
  month: MonthKey;
  monthLabel: string;
  inProgressMonth: MonthKey;
  search: SearchMetrics[];
  keywords: KeywordPerformance[];
}) {
  const partial = month === inProgressMonth;
  const trend = completeMonths(search, inProgressMonth);
  const [query, setQuery] = useState("");
  const current = search.find((row) => row.month === month);
  const prior = findPrior(search, month);
  const priorLabel = prior ? formatMonthShort(prior.month) : "";
  const countDetail = (value: number | undefined, previous: number | undefined) =>
    partial ? "Month in progress" : value === undefined ? undefined : describeChange("percent", value, previous, priorLabel);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? keywords.filter((row) => row.keyword.toLowerCase().includes(needle)) : keywords;
  }, [keywords, query]);

  return (
    <>
      {current ? (
        <MetricGrid>
          <MetricCard label="Search clicks" value={formatNumber(current.clicks)} detail={countDetail(current.clicks, prior?.clicks)} />
          <MetricCard label="Impressions" value={formatNumber(current.impressions)} detail={countDetail(current.impressions, prior?.impressions)} />
          <MetricCard label="CTR" value={formatPercent(current.ctr, 1)} detail={describeChange("points", current.ctr, prior?.ctr, priorLabel)} />
          <MetricCard
            label="Average position"
            value={current.position.toFixed(1)}
            detail={describeChange("position", current.position, prior?.position, priorLabel)}
          />
        </MetricGrid>
      ) : (
        <EmptyState icon={BarChart3} title={`No search data for ${monthLabel}`} />
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard
          title="Search clicks"
          description={COMPLETE_MONTHS_NOTE}
          table={toMonthTable(trend, "Clicks", (row) => formatNumber(row.clicks))}
        >
          <LineTrendChart data={toChartData(trend, (row) => ({ clicks: row.clicks }))} series={CLICKS} height={200} />
        </ChartCard>
        <ChartCard
          title="Impressions"
          description={COMPLETE_MONTHS_NOTE}
          table={toMonthTable(trend, "Impressions", (row) => formatNumber(row.impressions))}
        >
          <LineTrendChart data={toChartData(trend, (row) => ({ impressions: row.impressions }))} series={IMPRESSIONS} height={200} />
        </ChartCard>
        <ChartCard
          title="Click-through rate"
          description="Share of impressions that became clicks"
          table={toMonthTable(trend, "CTR", (row) => formatPercent(row.ctr, 1))}
        >
          <LineTrendChart
            data={toChartData(trend, (row) => ({ ctr: row.ctr }))}
            series={CTR}
            format={(value) => formatPercent(value, 1)}
            axisFormat={(value) => formatPercent(value, 1)}
            height={200}
          />
        </ChartCard>
        <ChartCard
          title="Average position"
          description="Lower is better, so the axis runs upward as rankings improve"
          table={toMonthTable(trend, "Average position", (row) => row.position.toFixed(1))}
        >
          <LineTrendChart
            reversed
            data={toChartData(trend, (row) => ({ position: row.position }))}
            series={POSITION}
            format={(value) => value.toFixed(1)}
            axisFormat={(value) => value.toFixed(0)}
            domain={["auto", "auto"]}
            height={200}
          />
        </ChartCard>
      </div>

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Keyword performance</h2>
            <p className="text-xs text-muted-foreground">Sample list. It does not change with the selected month.</p>
          </div>
          <SearchInput value={query} onChange={setQuery} placeholder="Search keywords" />
        </div>
        <DataTable
          caption="Keyword performance"
          columns={COLUMNS}
          rows={filtered}
          getRowId={(row) => row.keyword}
          defaultSort={{ columnId: "clicks", direction: "desc" }}
          emptyTitle="No keywords match"
          emptyDescription="Try a different search term."
        />
      </section>
    </>
  );
}
