"use client";

import { ColumnChart } from "@/components/charts/column-chart";
import { RankedBars } from "@/components/charts/ranked-bars";
import { DataTable, type Column } from "@/components/data/data-table";
import { MetricCard, MetricGrid } from "@/components/data/metric-card";
import { Legend, LegendItem, Panel } from "@/components/data/panel";
import type { DateRange } from "@/lib/date-range";
import type { ReportWindow, SourceResult, TrafficLandingPage, TrafficOverview } from "@/lib/data/google";
import { formatNumber, formatPercent } from "@/lib/format";
import type { BucketUnit } from "@/lib/period-buckets";
import { SEARCH_AND_AI } from "@/server/google/traffic-overview";
import { tileChange } from "./delta";
import { shortenMiddle } from "./paths";
import { SourceIssueCard } from "./source-issue-card";
import { windowNote } from "./trend";
import { visitsTrend } from "./visits-trend";

const BAR_BLUE = "#0091FF";
const BAR_LIGHT = "#D6E9FB";

/** Landing pages shown; the full list is in GA4. */
const TOP_PAGES = 10;

const BY_UNIT: Record<BucketUnit, string> = { day: "By day", week: "By week", month: "By month" };

/** Share of `part` in `whole`, as "42%". "—" without a whole. */
const share = (part: number, whole: number) => (whole > 0 ? formatPercent((part / whole) * 100, 0) : "—");

const PAGE_COLUMNS: Column<TrafficLandingPage>[] = [
  {
    id: "page",
    header: "Page",
    cell: (row) => (
      <span className="font-medium text-ink" title={row.path}>
        {row.path === "/" ? "/ (home page)" : shortenMiddle(row.path)}
      </span>
    ),
  },
  { id: "visits", header: "Visits", align: "right", cell: (row) => <b className="font-semibold">{formatNumber(row.visits)}</b> },
  { id: "search", header: "From search, AI", align: "right", cell: (row) => share(row.searchAndAi, row.visits) },
  { id: "forms", header: "Forms", align: "right", hideBelow: "sm", cell: (row) => formatNumber(row.forms) },
];

export function TrafficOverviewView({
  range,
  window,
  overview,
}: {
  range: DateRange;
  window: ReportWindow | null;
  overview: SourceResult<TrafficOverview>;
}) {
  if (overview.status !== "ok" || !window) {
    return overview.status !== "ok" ? <SourceIssueCard title="Google Analytics 4" source={overview} /> : null;
  }

  const { totals, channels, daily, landingPages } = overview.data;
  const { current, previous } = totals;
  const hasPrior = previous.visits > 0;
  const { unit, columns } = visitsTrend(daily, range, window.current.to);
  const pages = landingPages.slice(0, TOP_PAGES);

  return (
    <>
      <MetricGrid>
        <MetricCard
          tone="neutral"
          label="Visits"
          value={formatNumber(current.visits)}
          {...tileChange("percent", current.visits, previous.visits, hasPrior)}
        />
        <MetricCard
          tone="neutral"
          label="Visitors"
          value={formatNumber(current.visitors)}
          {...tileChange("percent", current.visitors, previous.visitors, hasPrior)}
        />
        <MetricCard
          tone="blue"
          label="Visits from search and AI"
          value={formatNumber(current.searchAndAi)}
          {...tileChange("percent", current.searchAndAi, previous.searchAndAi, hasPrior)}
        />
        <MetricCard
          tone="green"
          label="Form submissions"
          value={formatNumber(current.forms)}
          {...tileChange("percent", current.forms, previous.forms, hasPrior)}
        />
      </MetricGrid>

      <Panel
        title="Visits over time"
        description={`${BY_UNIT[unit]} · ${windowNote(window)}`}
        actions={
          <Legend>
            <LegendItem color={BAR_BLUE} label="From search and AI" />
            <LegendItem color={BAR_LIGHT} label="Other channels" />
          </Legend>
        }
      >
        {columns.every((column) => column.visits === 0) ? (
          <p className="py-6 text-[13px] text-ink-quiet">No visits in this period.</p>
        ) : (
          <ColumnChart
            height={190}
            label={`Visits ${BY_UNIT[unit].toLowerCase()}, from search and AI plus other channels`}
            data={columns.map((column) => ({
              label: column.label,
              value: column.searchAndAi,
              extra: Math.max(0, column.visits - column.searchAndAi),
              partial: column.partial,
            }))}
          />
        )}
      </Panel>

      <div className="grid grid-cols-1 items-start gap-4 min-[1100px]:grid-cols-2">
        <Panel title="Where visits come from" description="Share of all visits in this period">
          {channels.length === 0 ? (
            <p className="py-6 text-[13px] text-ink-quiet">No visits in this period.</p>
          ) : (
            <RankedBars
              label="Visits by channel"
              labelWidth={120}
              rows={channels.map((row) => ({
                label: row.channel,
                value: row.visits,
                display: formatNumber(row.visits),
                secondary: share(row.visits, current.visits),
                muted: !SEARCH_AND_AI.has(row.channel),
              }))}
            />
          )}
        </Panel>
        <Panel flush title="Top landing pages" description="The first page people saw on the site">
          <DataTable
            bare
            caption="Top landing pages"
            columns={PAGE_COLUMNS}
            rows={pages}
            getRowId={(row) => row.path}
            emptyTitle="No landing pages in this period"
            emptyDescription="Try a longer period."
          />
        </Panel>
      </div>
    </>
  );
}
