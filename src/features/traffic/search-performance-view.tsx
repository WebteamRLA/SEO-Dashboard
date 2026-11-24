"use client";

import { useMemo, useState } from "react";
import type { ChartSeries } from "@/components/charts/charts";
import { DataTable, type Column } from "@/components/data/data-table";
import { ExternalLink } from "@/components/data/external-link";
import { MetricCard, MetricGrid } from "@/components/data/metric-card";
import { Panel } from "@/components/data/panel";
import { SearchInput } from "@/components/data/search-input";
import { SegmentedControl } from "@/components/data/segmented-control";
import type { KeywordRow, ReportWindow, SearchAnalytics, SourceResult } from "@/lib/data/google";
import { formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PageRow, SearchPoint } from "@/server/google/analytics";
import { tileChange } from "./delta";
import { SourceIssueCard } from "./source-issue-card";
import { LineTrendChart, TrendPanel, VolumeChart } from "./trend-panel";
import { labeller, toTrendData, toTrendTable, trendDescription, windowNote } from "./trend";

type Metric = "clicks" | "impressions" | "ctr" | "position";

const METRICS = [
  { value: "clicks", label: "Clicks" },
  { value: "impressions", label: "Impressions" },
  { value: "ctr", label: "CTR" },
  { value: "position", label: "Position" },
] as const;

const SERIES: Record<Metric, ChartSeries[]> = {
  clicks: [{ key: "clicks", label: "Search clicks", slot: 1 }],
  impressions: [{ key: "impressions", label: "Impressions", slot: 1 }],
  ctr: [{ key: "ctr", label: "CTR", slot: 1 }],
  position: [{ key: "position", label: "Average position", slot: 1 }],
};

const fixed1 = (value: number | null) => (value === null ? "—" : value.toFixed(1));
const percent1 = (value: number | null) => (value === null ? "—" : formatPercent(value, 1));

/** "/services/seo/" from a full Search Console URL. */
function pathOf(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}` || "/";
  } catch {
    return url;
  }
}

function changeText(change: number | null): string {
  if (change === null) return "New";
  if (change === 0) return "No change";
  return `${change > 0 ? "Up" : "Down"} ${Math.abs(change).toFixed(1)}`;
}

const PAGE_COLUMNS: Column<PageRow>[] = [
  {
    id: "page",
    header: "Page",
    cell: (row) => (
      <ExternalLink href={row.url} className="font-medium break-all">
        {pathOf(row.url)}
      </ExternalLink>
    ),
    sortValue: (row) => row.url,
  },
  { id: "clicks", header: "Clicks", align: "right", cell: (row) => <b className="font-semibold">{formatNumber(row.clicks)}</b>, sortValue: (row) => row.clicks },
  {
    id: "impressions",
    header: "Impressions",
    align: "right",
    hideBelow: "sm",
    cell: (row) => formatNumber(row.impressions),
    sortValue: (row) => row.impressions,
  },
  { id: "position", header: "Position", align: "right", cell: (row) => fixed1(row.position), sortValue: (row) => row.position },
];

const KEYWORD_COLUMNS: Column<KeywordRow>[] = [
  { id: "keyword", header: "Search term", cell: (row) => <span className="font-medium break-words">{row.query}</span>, sortValue: (row) => row.query },
  { id: "clicks", header: "Clicks", align: "right", cell: (row) => <b className="font-semibold">{formatNumber(row.clicks)}</b>, sortValue: (row) => row.clicks },
  {
    id: "impressions",
    header: "Impressions",
    align: "right",
    hideBelow: "sm",
    cell: (row) => formatNumber(row.impressions),
    sortValue: (row) => row.impressions,
  },
  { id: "position", header: "Position", align: "right", cell: (row) => fixed1(row.position), sortValue: (row) => row.position },
  {
    id: "change",
    header: "Change",
    align: "right",
    hideBelow: "xl",
    cell: (row) => (
      <span
        className={cn(
          "text-[13px]",
          row.positionChange === null || row.positionChange === 0
            ? "text-ink-quiet"
            : row.positionChange > 0
              ? "font-medium text-tone-good-fg"
              : "font-medium text-tone-critical-fg",
        )}
      >
        {changeText(row.positionChange)}
      </span>
    ),
    sortValue: (row) => row.positionChange,
  },
];

export function SearchPerformanceView({
  window,
  search,
  trend,
}: {
  window: ReportWindow | null;
  search: SourceResult<SearchAnalytics>;
  trend: SearchPoint[];
}) {
  const [metric, setMetric] = useState<Metric>("clicks");
  const [query, setQuery] = useState("");
  const keywords = useMemo(() => (search.status === "ok" ? search.data.keywords : []), [search]);
  const pages = useMemo(() => (search.status === "ok" ? search.data.pages : []), [search]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? keywords.filter((row) => row.query.toLowerCase().includes(needle)) : keywords;
  }, [keywords, query]);

  if (search.status !== "ok") return <SourceIssueCard title="Search Console" source={search} />;
  const { current, previous } = search.data.totals;
  const hasPrior = previous.impressions !== 0;
  const by = trendDescription(trend);
  const label = labeller(trend);

  const table = {
    clicks: toTrendTable(trend, "Clicks", (p) => formatNumber(p.clicks)),
    impressions: toTrendTable(trend, "Impressions", (p) => formatNumber(p.impressions)),
    ctr: toTrendTable(trend, "CTR", (p) => percent1(p.ctr)),
    position: toTrendTable(trend, "Average position", (p) => fixed1(p.position)),
  }[metric];
  const picked = METRICS.find((option) => option.value === metric)!;

  return (
    <>
      <MetricGrid>
        <MetricCard tone="blue" label="Clicks" value={formatNumber(current.clicks)} {...tileChange("percent", current.clicks, previous.clicks, hasPrior)} />
        <MetricCard
          tone="blue"
          label="Impressions"
          value={formatNumber(current.impressions)}
          {...tileChange("percent", current.impressions, previous.impressions, hasPrior)}
        />
        <MetricCard tone="green" label="Click-through rate" value={percent1(current.ctr)} {...tileChange("points", current.ctr, previous.ctr, hasPrior)} />
        <MetricCard
          tone="amber"
          label="Average position"
          value={fixed1(current.position)}
          {...tileChange("position", current.position, previous.position, hasPrior)}
        />
      </MetricGrid>

      {trend.length > 0 ? (
        <TrendPanel
          title="Google search over time"
          description={`${by}${window ? ` · ${windowNote(window)}` : ""}${metric === "position" ? " · lower is better, so the line rises as rankings improve" : ""}`}
          table={table}
          actions={<SegmentedControl label="Metric" options={METRICS} value={metric} onChange={setMetric} />}
        >
          {metric === "clicks" || metric === "impressions" ? (
            <VolumeChart
              label={`${picked.label} ${by.toLowerCase()}`}
              columns={trend.map((p) => ({ label: label(p), value: p[metric] }))}
              data={toTrendData(trend, (p) => ({ [metric]: p[metric] }))}
              series={SERIES[metric]}
            />
          ) : metric === "ctr" ? (
            <LineTrendChart
              data={toTrendData(trend, (p) => ({ ctr: p.ctr }))}
              series={SERIES.ctr}
              format={(value) => formatPercent(value, 1)}
              axisFormat={(value) => formatPercent(value, 1)}
              height={200}
            />
          ) : (
            <LineTrendChart
              reversed
              data={toTrendData(trend, (p) => ({ position: p.position }))}
              series={SERIES.position}
              format={(value) => value.toFixed(1)}
              axisFormat={(value) => value.toFixed(0)}
              domain={["auto", "auto"]}
              height={200}
            />
          )}
        </TrendPanel>
      ) : null}

      <div className="grid grid-cols-1 gap-4 min-[1100px]:grid-cols-2">
        <Panel flush title="Top pages" description="Pages people clicked on from Google">
          <DataTable
            bare
            caption="Top pages from Google search"
            columns={PAGE_COLUMNS}
            rows={pages}
            getRowId={(row) => row.url}
            defaultSort={{ columnId: "clicks", direction: "desc" }}
            emptyTitle="No pages in this period"
            emptyDescription="Try a longer period."
          />
        </Panel>
        <Panel
          flush
          title="Top search terms"
          description="What people searched before clicking. Google hides rare queries, so these add up to less than the totals above"
          toolbar={<SearchInput value={query} onChange={setQuery} placeholder="Search keywords" className="sm:w-full" />}
        >
          <DataTable
            bare
            caption="Keyword performance"
            columns={KEYWORD_COLUMNS}
            rows={filtered}
            getRowId={(row) => row.query}
            defaultSort={{ columnId: "clicks", direction: "desc" }}
            emptyTitle={keywords.length === 0 ? "No search queries in this period" : "No keywords match"}
            emptyDescription={keywords.length === 0 ? "Try a longer period." : "Try a different search term."}
          />
        </Panel>
      </div>
      <p className="text-xs text-ink-quiet">
        Change compares with the previous period: &ldquo;Up&rdquo; means a term ranks higher now, &ldquo;New&rdquo; means it
        was not among the previous period&rsquo;s top 1,000 queries.
      </p>
    </>
  );
}
