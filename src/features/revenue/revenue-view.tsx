"use client";

import { useMemo } from "react";
import { ChartCard } from "@/components/charts/chart-card";
import { ColumnChart } from "@/components/charts/column-chart";
import { MetricCard, MetricGrid } from "@/components/data/metric-card";
import { useLeads } from "@/features/leads/leads-store";
import { formatMoneyShort } from "@/features/leads/lead-ui";
import { WonRevenueBars } from "@/features/leads/lead-summary";
import { computeMonthlyRevenue, computeRevenueBySource, computeRevenueSummary } from "@/lib/domain/leads";
import { isWithin, type DateRange } from "@/lib/date-range";
import { formatCurrency, formatMonthShort, formatNumber } from "@/lib/format";
import type { MonthKey } from "@/lib/types";

export function RevenueView({
  range,
  periodText,
  months,
}: {
  range: DateRange;
  periodText: string;
  months: MonthKey[];
}) {
  const { leads } = useLeads();

  const data = useMemo(() => {
    const inPeriod = leads.filter((lead) => isWithin(lead.submittedAt, range));
    return {
      summary: computeRevenueSummary(inPeriod),
      monthly: computeMonthlyRevenue(leads, months),
      sources: computeRevenueBySource(inPeriod),
    };
  }, [leads, range, months]);

  const { summary, monthly, sources } = data;

  return (
    <>
      <MetricGrid>
        <MetricCard
          tone="amber"
          label="Total won revenue"
          value={formatCurrency(summary.totalWon)}
          detail="Leads submitted in this period"
        />
        <MetricCard
          tone="green"
          label="Won deals"
          value={formatNumber(summary.wonDeals)}
          detail="Leads submitted in this period"
        />
        <MetricCard
          tone="amber"
          label="Average deal value"
          value={formatCurrency(summary.averageDeal)}
          detail={summary.wonDeals === 0 ? "No won deals in this period" : "Per won deal"}
        />
      </MetricGrid>

      <ChartCard
        title="Monthly revenue"
        description="Won deal value by the month the lead was submitted, not the month it was won. Complete months only"
        table={{
          columns: ["Month", "Won revenue", "Won deals"],
          rows: monthly.map((row) => ({
            key: row.month,
            cells: [formatMonthShort(row.month), formatCurrency(row.revenue), formatNumber(row.deals)],
          })),
        }}
      >
        <ColumnChart
          label="Won revenue by lead submission month"
          data={monthly.map((row) => ({ label: formatMonthShort(row.month), value: row.revenue }))}
          formatValue={formatMoneyShort}
          height={200}
        />
      </ChartCard>

      <ChartCard
        title="Revenue by lead source"
        description={`Won revenue from leads submitted in this period: ${periodText}`}
        table={{
          columns: ["Source", "Won revenue", "Won deals"],
          rows: sources.map((row) => ({
            key: row.source,
            cells: [row.source, formatCurrency(row.revenue), formatNumber(row.deals)],
          })),
        }}
      >
        <WonRevenueBars
          rows={sources}
          emptyText={`No won deals in ${periodText}. Mark a lead as Won in the pipeline and it appears here.`}
        />
      </ChartCard>
    </>
  );
}
