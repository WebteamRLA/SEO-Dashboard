"use client";

import type { ChartSeries } from "@/components/charts/charts";
import { DataTable, type Column } from "@/components/data/data-table";
import { ExternalLink } from "@/components/data/external-link";
import { MetricCard, MetricGrid } from "@/components/data/metric-card";
import { Panel } from "@/components/data/panel";
import type { LandingPageSummary, ReportWindow, SearchAnalytics, SourceResult, TrafficAnalytics } from "@/lib/data/google";
import { formatNumber, formatPercent } from "@/lib/format";
import type { SearchPoint } from "@/server/google/analytics";
import { tileChange } from "./delta";
import { SourceIssueCard } from "./source-issue-card";
import { TrendPanel, VolumeChart } from "./trend-panel";
import { labeller, toTrendData, toTrendTable, trendDescription, windowNote } from "./trend";

/** "—" when the page is outside one source's top list, which is not the same as zero. */
const count = (value: number | null) => (value === null ? "—" : formatNumber(value));

const CLICK_SERIES: ChartSeries[] = [{ key: "clicks", label: "Organic clicks", slot: 1 }];

const COLUMNS: Column<LandingPageSummary>[] = [
  {
    id: "page",
    header: "Page",
    cell: (row) => (
      <ExternalLink href={row.url ?? undefined} className="font-medium break-all">
        {row.path}
      </ExternalLink>
    ),
    sortValue: (row) => row.path,
  },
  { id: "clicks", header: "Clicks", align: "right", cell: (row) => <b className="font-semibold">{count(row.clicks)}</b>, sortValue: (row) => row.clicks },
  {
    id: "impressions",
    header: "Impressions",
    align: "right",
    hideBelow: "md",
    cell: (row) => count(row.impressions),
    sortValue: (row) => row.impressions,
  },
  {
    id: "sessions",
    header: "Organic sessions",
    align: "right",
    hideBelow: "sm",
    cell: (row) => count(row.organicSessions),
    sortValue: (row) => row.organicSessions,
  },
];

export function SeoOverviewView({
  window,
  search,
  traffic,
  trend,
  landingPages,
}: {
  window: ReportWindow | null;
  search: SourceResult<SearchAnalytics>;
  traffic: SourceResult<TrafficAnalytics>;
  trend: SearchPoint[];
  landingPages: LandingPageSummary[];
}) {
  const totals = search.status === "ok" ? search.data.totals : null;
  const visits = traffic.status === "ok" ? traffic.data.totals : null;
  const noSearchPrior = totals !== null && totals.previous.impressions === 0;
  const noTrafficPrior = visits !== null && visits.previous.sessions === 0;

  const label = labeller(trend);

  return (
    <>
      {totals || visits ? (
        <MetricGrid className="xl:grid-cols-5">
          {totals ? (
            <>
              <MetricCard
                tone="blue"
                label="Organic clicks"
                value={formatNumber(totals.current.clicks)}
                {...tileChange("percent", totals.current.clicks, totals.previous.clicks, !noSearchPrior)}
              />
              <MetricCard
                tone="blue"
                label="Impressions"
                value={formatNumber(totals.current.impressions)}
                {...tileChange("percent", totals.current.impressions, totals.previous.impressions, !noSearchPrior)}
              />
              <MetricCard
                tone="green"
                label="Average CTR"
                value={totals.current.ctr === null ? "—" : formatPercent(totals.current.ctr, 1)}
                {...tileChange("points", totals.current.ctr, totals.previous.ctr, !noSearchPrior)}
              />
              <MetricCard
                tone="amber"
                label="Average position"
                value={totals.current.position === null ? "—" : totals.current.position.toFixed(1)}
                {...tileChange("position", totals.current.position, totals.previous.position, !noSearchPrior)}
              />
            </>
          ) : null}
          {visits ? (
            <MetricCard
              tone="blue"
              label="Organic sessions"
              value={formatNumber(visits.current.organicSessions)}
              {...tileChange("percent", visits.current.organicSessions, visits.previous.organicSessions, !noTrafficPrior)}
            />
          ) : null}
        </MetricGrid>
      ) : null}

      {search.status !== "ok" ? <SourceIssueCard title="Search Console" source={search} /> : null}
      {traffic.status !== "ok" ? <SourceIssueCard title="Google Analytics 4" source={traffic} /> : null}

      {trend.length > 0 ? (
        <TrendPanel
          title="Organic clicks over time"
          description={`${trendDescription(trend)} · Search Console${window ? ` · ${windowNote(window)}` : ""}`}
          table={toTrendTable(trend, "Organic clicks", (point) => formatNumber(point.clicks))}
        >
          <VolumeChart
            label="Organic clicks by period"
            columns={trend.map((point) => ({ label: label(point), value: point.clicks }))}
            data={toTrendData(trend, (point) => ({ clicks: point.clicks }))}
            series={CLICK_SERIES}
          />
        </TrendPanel>
      ) : null}

      {landingPages.length > 0 ? (
        <Panel
          flush
          title="Top landing pages"
          description="Clicks and impressions from Search Console, organic sessions from GA4. “—” means the page is not in that source’s top 250"
        >
          <DataTable
            bare
            caption="Top landing pages"
            columns={COLUMNS}
            rows={landingPages}
            getRowId={(row) => row.path}
            defaultSort={{ columnId: "clicks", direction: "desc" }}
          />
        </Panel>
      ) : null}
    </>
  );
}
