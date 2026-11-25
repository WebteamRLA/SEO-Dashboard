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
import type { PageRow, SearchPoint } from "@/server/google/analytics";
import { tileChange } from "./delta";
import { shortenMiddle } from "./paths";
import { SourceIssueCard } from "./source-issue-card";
import { TrendPanel, VolumeChart } from "./trend-panel";
import { labeller, toTrendData, trendDescription, windowNote } from "./trend";

type Metric = "clicks" | "impressions";

const METRICS = [
  { value: "clicks", label: "Clicks" },
  { value: "impressions", label: "Impressions" },
] as const;

const SERIES: Record<Metric, ChartSeries[]> = {
  clicks: [{ key: "clicks", label: "Search clicks", slot: 1 }],
  impressions: [{ key: "impressions", label: "Impressions", slot: 1 }],
};

const fixed1 = (value: number | null) => (value === null ? "—" : value.toFixed(1));
const percent1 = (value: number | null) => (value === null ? "—" : formatPercent(value, 1));

/** "/services/seo/" from a full Search Console URL. Keeps any #section, which Google reports as its own page. */
function pathOf(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/";
  } catch {
    return url;
  }
}

/** Each table shows only the rows with the most impressions; the full lists are in Search Console. */
const TOP_ROWS = 10;

/** The `count` rows seen most in Google, most impressions first; ties broken by clicks. */
function topByImpressions<T extends { clicks: number; impressions: number }>(rows: readonly T[], count = TOP_ROWS): T[] {
  return [...rows].sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks).slice(0, count);
}

const PAGE_COLUMNS: Column<PageRow>[] = [
  {
    id: "page",
    header: "Page",
    cell: (row) => (
      <span title={row.url}>
        <ExternalLink href={row.url} className="font-medium">
          {shortenMiddle(pathOf(row.url))}
        </ExternalLink>
      </span>
    ),
  },
  { id: "clicks", header: "Clicks", align: "right", cell: (row) => <b className="font-semibold">{formatNumber(row.clicks)}</b> },
  {
    id: "impressions",
    header: "Impressions",
    align: "right",
    cell: (row) => formatNumber(row.impressions),
  },
  { id: "position", header: "Position", align: "right", hideBelow: "sm", cell: (row) => fixed1(row.position) },
];

const KEYWORD_COLUMNS: Column<KeywordRow>[] = [
  { id: "keyword", header: "Search term", cell: (row) => <span className="font-medium break-words">{row.query}</span> },
  { id: "clicks", header: "Clicks", align: "right", cell: (row) => <b className="font-semibold">{formatNumber(row.clicks)}</b> },
  { id: "impressions", header: "Impressions", align: "right", cell: (row) => formatNumber(row.impressions) },
  { id: "position", header: "Position", align: "right", hideBelow: "sm", cell: (row) => fixed1(row.position) },
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
  const pages = useMemo(() => topByImpressions(search.status === "ok" ? search.data.pages : []), [search]);
  // Search looks through every term, then shows the best matches.
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return topByImpressions(needle ? keywords.filter((row) => row.query.toLowerCase().includes(needle)) : keywords);
  }, [keywords, query]);

  if (search.status !== "ok") return <SourceIssueCard title="Search Console" source={search} />;
  const { current, previous } = search.data.totals;
  const hasPrior = previous.impressions !== 0;
  const by = trendDescription(trend);
  const label = labeller(trend);

  const picked = METRICS.find((option) => option.value === metric)!;

  return (
    <>
      <MetricGrid>
        <MetricCard tone="blue" label="Clicks from Google Search" value={formatNumber(current.clicks)} {...tileChange("percent", current.clicks, previous.clicks, hasPrior)} />
        <MetricCard
          tone="blue"
          label="Impressions in Google Search"
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
          description={`${by}${window ? ` · ${windowNote(window)}` : ""}`}
          actions={<SegmentedControl label="Metric" options={METRICS} value={metric} onChange={setMetric} />}
        >
          <VolumeChart
            label={`${picked.label} ${by.toLowerCase()}`}
            columns={trend.map((p) => ({ label: label(p), value: p[metric] }))}
            data={toTrendData(trend, (p) => ({ [metric]: p[metric] }))}
            series={SERIES[metric]}
          />
        </TrendPanel>
      ) : null}

      <div className="grid grid-cols-1 gap-4 min-[1100px]:grid-cols-2">
        <Panel flush title="Top pages" description={`The ${TOP_ROWS} pages shown most often in Google, most impressions first`}>
          <DataTable
            bare
            caption="Top pages from Google search"
            columns={PAGE_COLUMNS}
            rows={pages}
            getRowId={(row) => row.url}
            emptyTitle="No pages in this period"
            emptyDescription="Try a longer period."
          />
        </Panel>
        <Panel
          flush
          title="Top search terms"
          description={`The ${TOP_ROWS} searches your site was shown for most, most impressions first. Google hides rare queries, so these add up to less than the totals above`}
          toolbar={<SearchInput value={query} onChange={setQuery} placeholder="Search keywords" className="sm:w-full" />}
        >
          <DataTable
            bare
            caption="Keyword performance"
            columns={KEYWORD_COLUMNS}
            rows={filtered}
            getRowId={(row) => row.query}
            emptyTitle={keywords.length === 0 ? "No search queries in this period" : "No keywords match"}
            emptyDescription={keywords.length === 0 ? "Try a longer period." : "Try a different search term."}
          />
        </Panel>
      </div>
    </>
  );
}
