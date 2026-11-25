"use client";

import { useMemo } from "react";
import { MetricCard, MetricGrid } from "@/components/data/metric-card";
import { Legend, LegendItem, Panel } from "@/components/data/panel";
import { RankedBars } from "@/components/charts/ranked-bars";
import { isWithin, type DateRange } from "@/lib/date-range";
import type { Lead, RevenueBySource } from "@/lib/types";
import { useLeads } from "./leads-store";
import { formatMoneyShort, plural } from "./lead-ui";

const OPEN_STAGES = new Set<Lead["stage"]>(["new", "contacted", "meeting", "proposal"]);
const SEARCH_AND_AI = new Set<Lead["attribution"]["source"]>(["Organic Search", "AI Search"]);

function summarise(leads: readonly Lead[]) {
  const genuine = leads.filter((lead) => lead.stage !== "spam");
  const bySource = new Map<string, number>();
  for (const lead of genuine) bySource.set(lead.attribution.source, (bySource.get(lead.attribution.source) ?? 0) + 1);
  return {
    total: genuine.length,
    fromSearchAndAi: genuine.filter((lead) => SEARCH_AND_AI.has(lead.attribution.source)).length,
    open: genuine.filter((lead) => OPEN_STAGES.has(lead.stage)).length,
    proposals: genuine.filter((lead) => lead.stage === "proposal").length,
    won: genuine.filter((lead) => lead.stage === "won").length,
    lost: genuine.filter((lead) => lead.stage === "lost").length,
    sources: [...bySource.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => ({
        label: source,
        value: count,
        muted: !SEARCH_AND_AI.has(source as Lead["attribution"]["source"]),
      })),
  };
}

/**
 * The top of the Leads pages: four KPI tiles and where leads came from,
 * whatever the filters below are set to. With `range` (List and Pipeline both
 * pass the topbar period) it covers leads added in that period; without it,
 * every card on the board. Teamwork has no deal values, so the tiles count
 * leads rather than money.
 */
export function LeadSummary({ range, periodText }: { range?: DateRange; periodText?: string } = {}) {
  const { leads } = useLeads();
  const summary = useMemo(
    () => summarise(range ? leads.filter((lead) => isWithin(lead.submittedAt, range)) : leads),
    [leads, range],
  );
  const scope = range ? "Added in this period" : "On the Teamwork board";

  return (
    <>
      <MetricGrid>
        <MetricCard
          tone="green"
          label="Leads"
          value={summary.total.toLocaleString("en-US")}
          detail={`${scope} · ${summary.fromSearchAndAi} from search and AI`}
        />
        <MetricCard
          tone="blue"
          label="In progress"
          value={summary.open.toLocaleString("en-US")}
          detail={`${plural(summary.proposals, "quote or proposal", "quotes or proposals")} out`}
        />
        <MetricCard
          tone="amber"
          label="Won"
          value={summary.won.toLocaleString("en-US")}
          detail="In the WON column"
        />
        <MetricCard label="Lost" value={summary.lost.toLocaleString("en-US")} detail="Did not go ahead" />
      </MetricGrid>
      <Panel
        id="leads-by-source"
        title="Where leads came from"
        description={
          range ? `Leads added in this period by the source tag on their Teamwork card · ${periodText ?? ""}` : "Every lead by the source tag on its Teamwork card"
        }
        actions={
          <Legend>
            <LegendItem color="var(--bar)" label="Search and AI" />
            <LegendItem color="var(--bar-muted)" label="Other" />
          </Legend>
        }
      >
        {summary.sources.length === 0 ? (
          <p className="py-2 text-[13px] text-ink-quiet">{range ? "No leads in this period." : "No leads yet."}</p>
        ) : (
          <RankedBars label="Leads by source" rows={summary.sources} labelWidth={130} />
        )}
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
