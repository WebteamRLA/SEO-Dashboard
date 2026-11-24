"use client";

import { RankedBars } from "@/components/charts/ranked-bars";
import type { ChartSeries } from "@/components/charts/charts";
import { DataTable, type Column } from "@/components/data/data-table";
import { MetricCard, MetricGrid } from "@/components/data/metric-card";
import { Legend, LegendItem, Panel } from "@/components/data/panel";
import type {
  ReportWindow,
  SourceResult,
  TrafficAnalytics,
} from "@/lib/data/google";
import { percentChange } from "@/lib/domain/change";
import { formatNumber } from "@/lib/format";
import type { LandingPageRow, TrafficPoint } from "@/server/google/analytics";
import { tileChange } from "./delta";
import { SourceIssueCard } from "./source-issue-card";
import { MAX_COLUMNS, TrendPanel, VolumeChart } from "./trend-panel";
import { labeller, toTrendData, trendDescription, windowNote } from "./trend";

const SESSIONS: ChartSeries[] = [
  { key: "organicSessions", label: "Organic search", slot: 1, color: "var(--bar)" },
  { key: "otherSessions", label: "Other channels", slot: 2, color: "var(--bar-light)" },
];

const ORGANIC = "Organic Search";

function changeCell(current: number, previous: number): string {
  const change = percentChange(current, previous);
  if (change === null) return current === 0 ? "—" : "New";
  return `${change > 0 ? "+" : ""}${change}%`;
}

const PAGE_COLUMNS: Column<LandingPageRow>[] = [
  {
    id: "page",
    header: "Page",
    cell: (row) => <span className="font-medium break-all">{row.path}</span>,
    sortValue: (row) => row.path,
  },
  {
    id: "sessions",
    header: "Visits",
    align: "right",
    cell: (row) => (
      <b className="font-semibold">{formatNumber(row.sessions)}</b>
    ),
    sortValue: (row) => row.sessions,
  },
  {
    id: "users",
    header: "Visitors",
    align: "right",
    hideBelow: "sm",
    cell: (row) => formatNumber(row.users),
    sortValue: (row) => row.users,
  },
];

export function VisitorsView({
  window,
  traffic,
  trend,
}: {
  window: ReportWindow | null;
  traffic: SourceResult<TrafficAnalytics>;
  trend: TrafficPoint[];
}) {
  if (traffic.status !== "ok")
    return <SourceIssueCard title="Google Analytics 4" source={traffic} />;
  const { totals, breakdown } = traffic.data;
  const { current, previous } = totals;
  const hasPrior = previous.sessions !== 0;

  const label = labeller(trend);
  const channels = breakdown.channels.filter((row) => row.sessions > 0);
  const channelTotal = channels.reduce((sum, row) => sum + row.sessions, 0);
  const channelRows = channels.map((row) => ({
    label: row.channel,
    value: row.sessions,
    display: formatNumber(row.sessions),
    secondary:
      channelTotal > 0
        ? `${Math.round((row.sessions / channelTotal) * 100)}%`
        : undefined,
    muted: row.channel !== ORGANIC,
  }));
  const withOther = trend.map((point) => ({
    ...point,
    otherSessions: Math.max(point.sessions - point.organicSessions, 0),
  }));
  const unit = trend[0]?.unit === "month" ? "Month" : "Day";

  return (
    <>
      <MetricGrid>
        <MetricCard
          tone="blue"
          label="Visits"
          value={formatNumber(current.sessions)}
          {...tileChange(
            "percent",
            current.sessions,
            previous.sessions,
            hasPrior,
          )}
        />
        <MetricCard
          tone="blue"
          label="Visitors"
          value={formatNumber(current.users)}
          {...tileChange("percent", current.users, previous.users, hasPrior)}
        />
        <MetricCard
          tone="blue"
          label="Organic search visits"
          value={formatNumber(current.organicSessions)}
          {...tileChange(
            "percent",
            current.organicSessions,
            previous.organicSessions,
            hasPrior,
          )}
        />
        <MetricCard
          tone="neutral"
          label="Referral visits"
          value={formatNumber(breakdown.referral.current)}
          {...tileChange(
            "percent",
            breakdown.referral.current,
            breakdown.referral.previous,
            hasPrior,
          )}
        />
      </MetricGrid>

      {trend.length > 0 ? (
        <TrendPanel
          title="Visits over time"
          description={`${trendDescription(trend)}${window ? ` · ${windowNote(window)}` : ""}`}
          table={{
            columns: [unit, "Organic search", "Other channels", "All visits"],
            rows: withOther.map((point) => ({
              key: point.start,
              cells: [
                label(point),
                formatNumber(point.organicSessions),
                formatNumber(point.otherSessions),
                formatNumber(point.sessions),
              ],
            })),
          }}
          actions={
            // The recharts fallback (long ranges) draws its own legend in its own colours.
            withOther.length > MAX_COLUMNS ? undefined : (
              <Legend>
                <LegendItem color="var(--bar)" label="Organic search" />
                <LegendItem color="var(--bar-light)" label="Other channels" />
              </Legend>
            )
          }
        >
          <VolumeChart
            label="Visits by period, organic search and other channels"
            columns={withOther.map((point) => ({
              label: label(point),
              value: point.organicSessions,
              extra: point.otherSessions,
            }))}
            data={toTrendData(withOther, (point) => ({
              organicSessions: point.organicSessions,
              otherSessions: point.otherSessions,
            }))}
            series={SESSIONS}
            stacked
          />
          <p className="mt-3 text-xs text-ink-quiet">
            GA4 estimates sessions, so the points can add up to slightly more or
            less than the total.
          </p>
        </TrendPanel>
      ) : null}

      <div className="grid grid-cols-1 gap-4 min-[1100px]:grid-cols-2">
        {channels.length > 0 ? (
          <TrendPanel
            title="Where visits come from"
            description="Share of all visits in this period, by GA4 default channel group"
            table={{
              columns: ["Channel", "Visits", "Previous period", "Change"],
              rows: channels.map((row) => ({
                key: row.channel,
                cells: [
                  row.channel,
                  formatNumber(row.sessions),
                  formatNumber(row.previousSessions),
                  changeCell(row.sessions, row.previousSessions),
                ],
              })),
            }}
          >
            <RankedBars
              rows={channelRows}
              label="Visits by traffic channel"
              labelWidth={130}
            />
          </TrendPanel>
        ) : null}

        <Panel
          flush
          title="Top landing pages"
          description="The first page people saw on the site, from organic search"
        >
          <DataTable
            bare
            caption="Top organic landing pages"
            columns={PAGE_COLUMNS}
            rows={breakdown.landingPages}
            getRowId={(row) => row.path}
            defaultSort={{ columnId: "sessions", direction: "desc" }}
            emptyTitle="No landing pages in this period"
            emptyDescription="Try a longer period."
          />
        </Panel>
      </div>
    </>
  );
}
