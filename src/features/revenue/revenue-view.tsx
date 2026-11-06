"use client";

import { useMemo } from "react";
import { DollarSign } from "lucide-react";
import { ChartCard } from "@/components/charts/chart-card";
import { BarTrendChart, type ChartSeries } from "@/components/charts/charts";
import { RankedBars } from "@/components/charts/ranked-bars";
import { EmptyState } from "@/components/data/empty-state";
import { MetricCard, MetricGrid } from "@/components/data/metric-card";
import { useLeads } from "@/features/leads/leads-store";
import {
  computeMonthlyRevenue,
  computeRevenueBySource,
  computeRevenueSummary,
  leadsInMonth,
} from "@/lib/domain/leads";
import { formatCompact, formatCurrency, formatMonthShort, formatNumber } from "@/lib/format";
import type { MonthKey } from "@/lib/types";

const REVENUE: ChartSeries[] = [{ key: "revenue", label: "Won revenue", slot: 1 }];

export function RevenueView({
  month,
  monthLabel,
  months,
}: {
  month: MonthKey;
  monthLabel: string;
  months: MonthKey[];
}) {
  const { leads } = useLeads();

  const data = useMemo(() => {
    const inMonth = leadsInMonth(leads, month);
    return {
      summary: computeRevenueSummary(inMonth),
      monthly: computeMonthlyRevenue(leads, months),
      sources: computeRevenueBySource(inMonth),
    };
  }, [leads, month, months]);

  const { summary, monthly, sources } = data;

  return (
    <>
      <MetricGrid className="lg:grid-cols-3 xl:grid-cols-3">
        <MetricCard label="Total won revenue" value={formatCurrency(summary.totalWon)} detail={`Leads submitted in ${monthLabel}`} />
        <MetricCard label="Won deals" value={formatNumber(summary.wonDeals)} detail={`Leads submitted in ${monthLabel}`} />
        <MetricCard
          label="Average deal value"
          value={formatCurrency(summary.averageDeal)}
          detail={summary.wonDeals === 0 ? "No won deals this month" : undefined}
        />
      </MetricGrid>

      <p className="text-xs text-muted-foreground">
        Revenue is grouped by the month a lead was submitted, not the month the deal was won.
      </p>

      <ChartCard
        title="Monthly revenue"
        description="Won deal value by lead submission month. Complete months only"
        table={{
          columns: ["Month", "Won revenue", "Won deals"],
          rows: monthly.map((row) => ({
            key: row.month,
            cells: [formatMonthShort(row.month), formatCurrency(row.revenue), formatNumber(row.deals)],
          })),
        }}
      >
        <BarTrendChart
          data={monthly.map((row) => ({ label: formatMonthShort(row.month), revenue: row.revenue }))}
          series={REVENUE}
          format={formatCurrency}
          axisFormat={formatCompact}
        />
      </ChartCard>

      <ChartCard
        title="Revenue by lead source"
        description={`Won revenue from leads submitted in ${monthLabel}`}
        table={{
          columns: ["Source", "Won revenue", "Won deals"],
          rows: sources.map((row) => ({
            key: row.source,
            cells: [row.source, formatCurrency(row.revenue), formatNumber(row.deals)],
          })),
        }}
      >
        {sources.length === 0 ? (
          <EmptyState icon={DollarSign} title={`No won deals in ${monthLabel}`} description="Mark a lead as Won in the pipeline and it appears here." />
        ) : (
          <RankedBars
            label="Won revenue by lead source"
            rows={sources.map((row) => ({ label: row.source, value: row.revenue, display: formatCurrency(row.revenue) }))}
          />
        )}
      </ChartCard>
    </>
  );
}
