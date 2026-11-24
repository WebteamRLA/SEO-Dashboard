"use client";

import { RankedBars } from "@/components/charts/ranked-bars";
import { DataTable, type Column } from "@/components/data/data-table";
import { MetricCard, MetricGrid } from "@/components/data/metric-card";
import { Panel } from "@/components/data/panel";
import type { BehaviorData, EnquiryLandingPage, PageEngagement, ReportWindow, SourceResult } from "@/lib/data/google";
import { formatDuration, formatNumber, formatPercent } from "@/lib/format";
import { SourceIssueCard } from "./source-issue-card";
import { tileChange } from "./delta";
import { TrendPanel } from "./trend-panel";
import { eventLabel, windowNote } from "./trend";

const percent1 = (value: number | null) => (value === null ? "—" : formatPercent(value, 1));
const duration = (value: number | null) => (value === null ? "—" : formatDuration(value));

const ENQUIRY_COLUMNS: Column<EnquiryLandingPage>[] = [
  { id: "page", header: "Landing page", cell: (row) => <span className="font-medium break-all">{row.path}</span>, sortValue: (row) => row.path },
  { id: "keyEvents", header: "Enquiries", align: "right", cell: (row) => <b className="font-semibold">{formatNumber(row.keyEvents)}</b>, sortValue: (row) => row.keyEvents },
  { id: "sessions", header: "Visits", align: "right", hideBelow: "sm", cell: (row) => formatNumber(row.sessions), sortValue: (row) => row.sessions },
  {
    id: "rate",
    header: "Conversion rate",
    align: "right",
    hideBelow: "md",
    cell: (row) => percent1(row.conversionRate),
    sortValue: (row) => row.conversionRate,
  },
];

const PAGE_COLUMNS: Column<PageEngagement>[] = [
  { id: "page", header: "Page", cell: (row) => <span className="font-medium break-all">{row.path}</span>, sortValue: (row) => row.path },
  { id: "views", header: "Views", align: "right", cell: (row) => <b className="font-semibold">{formatNumber(row.views)}</b>, sortValue: (row) => row.views },
  {
    id: "time",
    header: "Engagement time per view",
    align: "right",
    hideBelow: "sm",
    cell: (row) => duration(row.secondsPerView),
    sortValue: (row) => row.secondsPerView,
  },
  {
    id: "read",
    header: "Read to the end",
    align: "right",
    hideBelow: "md",
    cell: (row) => percent1(row.readToEnd),
    sortValue: (row) => row.readToEnd,
  },
];

export function BehaviorView({ window, behavior }: { window: ReportWindow | null; behavior: SourceResult<BehaviorData> }) {
  if (behavior.status !== "ok") return <SourceIssueCard title="Google Analytics 4" source={behavior} />;
  const { totals, pages, enquiryPages, keyEvents, devices } = behavior.data;
  const { current, previous } = totals;
  const hasPrior = previous.sessions !== 0;
  const deviceRows = devices.map((row) => ({ label: row.device, value: row.sessions, display: formatNumber(row.sessions) }));

  return (
    <>
      <MetricGrid>
        <MetricCard
          tone="blue"
          label="Engagement rate"
          value={percent1(current.engagementRate)}
          {...tileChange("points", current.engagementRate, previous.engagementRate, hasPrior)}
        />
        <MetricCard
          tone="blue"
          label="Engagement time per visit"
          value={duration(current.engagementSeconds)}
          {...tileChange("percent", current.engagementSeconds, previous.engagementSeconds, hasPrior)}
        />
        <MetricCard
          tone="blue"
          label="Pages per visit"
          value={current.viewsPerSession === null ? "—" : current.viewsPerSession.toFixed(1)}
          {...tileChange("percent", current.viewsPerSession, previous.viewsPerSession, hasPrior)}
        />
        <MetricCard
          tone="green"
          label="Enquiries"
          value={formatNumber(current.keyEvents)}
          {...tileChange("percent", current.keyEvents, previous.keyEvents, hasPrior)}
        />
      </MetricGrid>
      <p className="text-xs text-ink-quiet">
        {window ? `${windowNote(window)} ` : ""}A visit is engaged when it lasts over 10 seconds, views two or more pages, or includes an enquiry. Enquiries are
        GA4 key events{keyEvents.length > 0 ? `: ${keyEvents.map((row) => `${eventLabel(row.event)} (${formatNumber(row.count)})`).join(", ")}` : ""}.
      </p>

      <Panel
        flush
        title="Pages that lead to enquiries"
        description="The page each visit started on, for visits that ended in an enquiry. GA4 does not give full click paths, so this shows where enquiring visitors arrived"
      >
        <DataTable
          bare
          caption="Landing pages of visits with an enquiry"
          columns={ENQUIRY_COLUMNS}
          rows={enquiryPages}
          getRowId={(row) => row.path}
          defaultSort={{ columnId: "keyEvents", direction: "desc" }}
          emptyTitle="No enquiries in this period"
          emptyDescription="Try a longer period."
        />
      </Panel>

      <Panel
        flush
        title="Page engagement"
        description={`Top ${formatNumber(pages.length)} pages by views. “Read to the end” is the share of views where the visitor scrolled 90% of the page, the only scroll depth GA4 records by default`}
      >
        <DataTable
          bare
          caption="Page engagement"
          columns={PAGE_COLUMNS}
          rows={pages}
          getRowId={(row) => row.path}
          defaultSort={{ columnId: "views", direction: "desc" }}
          emptyTitle="No page views in this period"
          emptyDescription="Try a longer period."
        />
      </Panel>

      {deviceRows.length > 0 ? (
        <TrendPanel
          title="Devices"
          description="Visits by device type, with engagement rate in the table"
          table={{
            columns: ["Device", "Visits", "Engagement rate"],
            rows: devices.map((row) => ({ key: row.device, cells: [row.device, formatNumber(row.sessions), percent1(row.engagementRate)] })),
          }}
        >
          <RankedBars rows={deviceRows} label="Visits by device" />
        </TrendPanel>
      ) : null}
    </>
  );
}
