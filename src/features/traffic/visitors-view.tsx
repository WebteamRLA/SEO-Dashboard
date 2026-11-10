"use client";

import { Users } from "lucide-react";
import { ChartCard } from "@/components/charts/chart-card";
import { BarTrendChart, type ChartSeries } from "@/components/charts/charts";
import { RankedBars } from "@/components/charts/ranked-bars";
import { EmptyState } from "@/components/data/empty-state";
import { MetricCard, MetricGrid } from "@/components/data/metric-card";
import { formatNumber } from "@/lib/format";
import { monthsInRange, previousRange, type DateRange } from "@/lib/date-range";
import type { MonthKey, TrafficChannel, TrafficMetrics } from "@/lib/types";
import { completeMonths } from "@/lib/month";
import { aggregateTraffic, PRIOR_LABEL, roundingNote } from "./aggregate";
import { COMPLETE_MONTHS_NOTE, describeChange, toChartData, toMonthTable } from "./trend";

const SESSIONS: ChartSeries[] = [{ key: "sessions", label: "Sessions", slot: 1 }];

export function VisitorsView({
  range,
  periodText,
  inProgressMonth,
  traffic,
  channels,
}: {
  range: DateRange;
  periodText: string;
  inProgressMonth: MonthKey;
  traffic: TrafficMetrics[];
  channels: TrafficChannel[];
}) {
  const months = monthsInRange(range);
  const partial = months.includes(inProgressMonth);
  const trend = completeMonths(traffic, inProgressMonth);
  const current = aggregateTraffic(traffic, months);
  const prior = aggregateTraffic(traffic, monthsInRange(previousRange(range)));
  const detail = (value: number | undefined, previous: number | undefined) =>
    partial ? "Includes the current month" : value === undefined ? undefined : describeChange("percent", value, previous, PRIOR_LABEL);

  const channelRows = [...channels]
    .sort((a, b) => b.sessions - a.sessions)
    .map((channel) => ({ label: channel.channel, value: channel.sessions, display: formatNumber(channel.sessions) }));

  return (
    <>
      {current ? (
        <MetricGrid>
          <MetricCard label="Sessions" value={formatNumber(current.sessions)} detail={detail(current.sessions, prior?.sessions)} />
          <MetricCard label="Users" value={formatNumber(current.users)} detail={detail(current.users, prior?.users)} />
          <MetricCard
            label="Organic traffic"
            value={formatNumber(current.organicSessions)}
            detail={detail(current.organicSessions, prior?.organicSessions)}
          />
          <MetricCard
            label="Referral traffic"
            value={formatNumber(current.referralSessions)}
            detail={detail(current.referralSessions, prior?.referralSessions)}
          />
        </MetricGrid>
      ) : (
        <EmptyState icon={Users} title={`No traffic data for ${periodText}`} />
      )}
      <p className="text-xs text-muted-foreground">{roundingNote(months)}</p>

      <ChartCard
        title="Sessions by month"
        description={COMPLETE_MONTHS_NOTE}
        table={toMonthTable(trend, "Sessions", (row) => formatNumber(row.sessions))}
      >
        <BarTrendChart data={toChartData(trend, (row) => ({ sessions: row.sessions }))} series={SESSIONS} />
      </ChartCard>

      <ChartCard
        title="Traffic channels"
        description="Sample channel split. It does not change with the selected period."
        table={{
          columns: ["Channel", "Sessions"],
          rows: channelRows.map((row) => ({ key: row.label, cells: [row.label, row.display] })),
        }}
      >
        <RankedBars rows={channelRows} label="Sessions by traffic channel" />
      </ChartCard>
    </>
  );
}
