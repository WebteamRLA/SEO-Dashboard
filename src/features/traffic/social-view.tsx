"use client";

import type { ChartSeries } from "@/components/charts/charts";
import { DataTable, type Column } from "@/components/data/data-table";
import { MetricCard, MetricGrid } from "@/components/data/metric-card";
import { Panel } from "@/components/data/panel";
import type { ReportWindow, SocialLandingPage, SocialPlatformRow, SocialTraffic, SourceResult } from "@/lib/data/google";
import { percentChange } from "@/lib/domain/change";
import { formatNumber, formatPercent } from "@/lib/format";
import type { SocialPoint } from "@/server/google/engagement";
import { SourceIssueCard } from "./source-issue-card";
import { tileChange } from "./delta";
import { TrendPanel, VolumeChart } from "./trend-panel";
import { labeller, toTrendData, toTrendTable, trendDescription, windowNote } from "./trend";

const VISITS: ChartSeries[] = [{ key: "sessions", label: "Visits from social", slot: 1 }];

function changeText(current: number, previous: number): string {
  const change = percentChange(current, previous);
  if (change === null) return current === 0 ? "—" : "New";
  return `${change > 0 ? "+" : ""}${change}%`;
}

const PLATFORM_COLUMNS: Column<SocialPlatformRow>[] = [
  { id: "platform", header: "Platform", cell: (row) => <span className="font-medium">{row.platform}</span>, sortValue: (row) => row.platform },
  { id: "sessions", header: "Visits", align: "right", cell: (row) => <b className="font-semibold">{formatNumber(row.sessions)}</b>, sortValue: (row) => row.sessions },
  {
    id: "previous",
    header: "Previous period",
    align: "right",
    hideBelow: "md",
    cell: (row) => `${formatNumber(row.previousSessions)} (${changeText(row.sessions, row.previousSessions)})`,
    sortValue: (row) => row.previousSessions,
  },
  {
    id: "engaged",
    header: "Engaged visits",
    align: "right",
    hideBelow: "sm",
    cell: (row) => formatNumber(row.engagedSessions),
    sortValue: (row) => row.engagedSessions,
  },
  { id: "keyEvents", header: "Enquiries", align: "right", hideBelow: "lg", cell: (row) => formatNumber(row.keyEvents), sortValue: (row) => row.keyEvents },
];

const PAGE_COLUMNS: Column<SocialLandingPage>[] = [
  { id: "page", header: "Landing page", cell: (row) => <span className="font-medium break-all">{row.path}</span>, sortValue: (row) => row.path },
  { id: "sessions", header: "Visits", align: "right", cell: (row) => <b className="font-semibold">{formatNumber(row.sessions)}</b>, sortValue: (row) => row.sessions },
  { id: "keyEvents", header: "Enquiries", align: "right", hideBelow: "sm", cell: (row) => formatNumber(row.keyEvents), sortValue: (row) => row.keyEvents },
];

/** The website side of social: visits that arrived from social networks, from GA4. */
export function SocialView({
  window,
  social,
  trend,
}: {
  window: ReportWindow | null;
  social: SourceResult<SocialTraffic>;
  trend: SocialPoint[];
}) {
  if (social.status !== "ok") return <SourceIssueCard title="Google Analytics 4" source={social} />;
  const { totals, platforms, landingPages } = social.data;
  const { current, previous } = totals;
  const hasPrior = previous.sessions !== 0;
  const label = labeller(trend);
  const engagedRate = current.sessions ? Math.round((current.engagedSessions / current.sessions) * 1000) / 10 : null;

  return (
    <>
      <MetricGrid className="xl:grid-cols-3">
        <MetricCard
          tone="blue"
          label="Visits from social"
          value={formatNumber(current.sessions)}
          {...tileChange("percent", current.sessions, previous.sessions, hasPrior)}
        />
        <MetricCard
          tone="blue"
          label="Engaged visits"
          value={formatNumber(current.engagedSessions)}
          detail={engagedRate === null ? undefined : `${formatPercent(engagedRate, 1)} of social visits`}
        />
        <MetricCard
          tone="green"
          label="Enquiries from social"
          value={formatNumber(current.keyEvents)}
          {...tileChange("percent", current.keyEvents, previous.keyEvents, hasPrior)}
        />
      </MetricGrid>

      {trend.length > 0 ? (
        <TrendPanel
          title="Visits from social over time"
          description={`${trendDescription(trend)}${window ? ` · ${windowNote(window)}` : ""}`}
          table={toTrendTable(trend, "Visits", (point) => formatNumber(point.sessions))}
        >
          <VolumeChart
            label="Visits from social by period"
            columns={trend.map((point) => ({ label: label(point), value: point.sessions }))}
            data={toTrendData(trend, (point) => ({ sessions: point.sessions }))}
            series={VISITS}
          />
        </TrendPanel>
      ) : null}

      <div className="grid grid-cols-1 gap-4 min-[1100px]:grid-cols-2">
        <Panel
          flush
          title="Visits by platform"
          description="Organic and paid social, grouped by platform (m.facebook.com and facebook.com both count as Facebook)"
        >
          <DataTable
            bare
            caption="Visits from social by platform"
            columns={PLATFORM_COLUMNS}
            rows={platforms}
            getRowId={(row) => row.platform}
            defaultSort={{ columnId: "sessions", direction: "desc" }}
            emptyTitle="No visits from social in this period"
            emptyDescription="Try a longer period."
          />
        </Panel>

        {landingPages.length > 0 ? (
          <Panel flush title="Pages social visitors land on" description="The first page each visit from social saw">
            <DataTable
              bare
              caption="Landing pages of visits from social"
              columns={PAGE_COLUMNS}
              rows={landingPages}
              getRowId={(row) => row.path}
              defaultSort={{ columnId: "sessions", direction: "desc" }}
            />
          </Panel>
        ) : null}
      </div>
    </>
  );
}
