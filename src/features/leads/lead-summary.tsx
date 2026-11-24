"use client";

import { useMemo } from "react";
import { MetricCard, MetricGrid } from "@/components/data/metric-card";
import { Panel } from "@/components/data/panel";
import { computeLeadMetrics, computeRevenueBySource } from "@/lib/domain/leads";
import type { Lead, RevenueBySource } from "@/lib/types";
import { useLeads } from "./leads-store";
import { formatMoneyShort, plural } from "./lead-ui";

const OPEN_STAGES = new Set<Lead["stage"]>(["new", "contacted", "meeting", "proposal"]);
const SEARCH_AND_AI = new Set<Lead["attribution"]["source"]>(["Organic Search", "AI Search"]);

function summarise(leads: readonly Lead[]) {
  const metrics = computeLeadMetrics(leads);
  const open = leads.filter((lead) => OPEN_STAGES.has(lead.stage));
  const valued = open.filter((lead) => (lead.dealValue ?? 0) > 0);
  return {
    metrics,
    fromSearchAndAi: leads.filter((lead) => lead.stage !== "spam" && SEARCH_AND_AI.has(lead.attribution.source)).length,
    openLeads: open.length,
    openValue: valued.reduce((sum, lead) => sum + (lead.dealValue ?? 0), 0),
    openValued: valued.length,
    lost: leads.filter((lead) => lead.stage === "lost").length,
    wonBySource: computeRevenueBySource(leads),
  };
}

/**
 * The top of the Leads pages: four KPI tiles and where won revenue came from.
 * It covers every lead in the dashboard (spam excluded), whatever the
 * filters below are set to, so List and Pipeline show the same figures.
 */
export function LeadSummary() {
  const { leads } = useLeads();
  const summary = useMemo(() => summarise(leads), [leads]);
  const { metrics } = summary;

  return (
    <>
      <MetricGrid>
        <MetricCard
          tone="green"
          label="Leads"
          value={metrics.genuine.toLocaleString("en-US")}
          detail={`All time · ${summary.fromSearchAndAi} from search and AI tools`}
        />
        <MetricCard
          tone="blue"
          label="Open pipeline"
          value={formatMoneyShort(summary.openValue)}
          detail={
            summary.openValued > 0
              ? `${plural(summary.openValued, "deal")} in progress`
              : `${plural(summary.openLeads, "open lead")}, no deal values yet`
          }
        />
        <MetricCard
          tone="amber"
          label="Won revenue"
          value={formatMoneyShort(metrics.wonRevenue)}
          detail={metrics.won > 0 ? `${plural(metrics.won, "deal")} won` : "No deals won yet"}
        />
        <MetricCard label="Lost" value={summary.lost.toLocaleString("en-US")} detail="Did not go ahead" />
      </MetricGrid>
      <Panel
        id="won-by-source"
        title="Where won revenue came from"
        description="Won deal value by the channel that brought the lead, all time"
      >
        <WonRevenueBars rows={summary.wonBySource} emptyText="No deals have been won from leads yet." />
      </Panel>
    </>
  );
}

/**
 * Won revenue per lead source as green bars on a grey track, with the value
 * and deal count in text at the end of each row.
 */
export function WonRevenueBars({ rows, emptyText }: { rows: readonly RevenueBySource[]; emptyText: string }) {
  if (rows.length === 0) return <p className="py-2 text-[13px] text-ink-quiet">{emptyText}</p>;
  const max = Math.max(...rows.map((row) => row.revenue), 1);
  return (
    <ul className="flex flex-col gap-3" aria-label="Won revenue by lead source">
      {rows.map((row) => (
        <li
          key={row.source}
          className="grid grid-cols-[minmax(0,110px)_minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[150px_minmax(0,1fr)_150px]"
        >
          <span className="truncate text-[13px] text-ink-body">{row.source}</span>
          <span className="h-2 min-w-0 rounded bg-bar-track">
            <span className="block h-full rounded bg-status-good" style={{ width: `${(row.revenue / max) * 100}%` }} />
          </span>
          <span className="text-right text-[13px] whitespace-nowrap tabular-nums">
            <span className="font-semibold text-ink">{formatMoneyShort(row.revenue)}</span>
            <span className="text-ink-quiet"> · {plural(row.deals, "deal")}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
