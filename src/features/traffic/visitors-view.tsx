"use client";

import { Users } from "lucide-react";
import { ChartCard } from "@/components/charts/chart-card";
import { BarTrendChart, type ChartSeries } from "@/components/charts/charts";
import { RankedBars } from "@/components/charts/ranked-bars";
import { EmptyState } from "@/components/data/empty-state";
import { MetricCard, MetricGrid } from "@/components/data/metric-card";
import { formatMonthShort, formatNumber } from "@/lib/format";
import type { MonthKey, TrafficChannel, TrafficMetrics } from "@/lib/types";
import { completeMonths } from "@/lib/month";
import { COMPLETE_MONTHS_NOTE, describeChange, findPrior, toChartData, toMonthTable } from "./trend";

const SESSIONS: ChartSeries[] = [{ key: "sessions", label: "Sessions", slot: 1 }];

export function VisitorsView({
  month,
  monthLabel,
  inProgressMonth,
  traffic,
  channels,
}: {
  month: MonthKey;
  monthLabel: string;
  inProgressMonth: MonthKey;
  traffic: TrafficMetrics[];
  channels: TrafficChannel[];
}) {
  const partial = month === inProgressMonth;
  const trend = completeMonths(traffic, inProgressMonth);
  const current = traffic.find((row) => row.month === month);
  const prior = findPrior(traffic, month);
  const priorLabel = prior ? formatMonthShort(prior.month) : "";
  const detail = (value: number | undefined, previous: number | undefined) =>
    partial ? "Month in progress" : value === undefined ? undefined : describeChange("percent", value, previous, priorLabel);

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
        <EmptyState icon={Users} title={`No traffic data for ${monthLabel}`} />
      )}

      <ChartCard
        title="Sessions by month"
        description={COMPLETE_MONTHS_NOTE}
        table={toMonthTable(trend, "Sessions", (row) => formatNumber(row.sessions))}
      >
        <BarTrendChart data={toChartData(trend, (row) => ({ sessions: row.sessions }))} series={SESSIONS} />
      </ChartCard>

      <ChartCard
        title="Traffic channels"
        description="Sample channel split. It does not change with the selected month."
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
