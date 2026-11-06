"use client";

import { useMemo } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { Button } from "@/components/ui/button";
import { useLeads } from "@/features/leads/leads-store";
import { computeLeadMetrics, leadsInMonth } from "@/lib/domain/leads";
import { formatCompact, formatCurrency, formatMonth, formatNumber } from "@/lib/format";
import type { LeadMetrics, MonthlyReport } from "@/lib/types";
import { REPORT_STATUS_META } from "./reports-meta";

/** One decimal place, as positions are read to the tenth. Zero means no data. */
function formatPosition(position: number): string {
  return position > 0 ? formatNumber(Math.round(position * 10) / 10) : "—";
}

type ReportRow = MonthlyReport & { metrics: LeadMetrics };

const columns: Column<ReportRow>[] = [
  {
    id: "period",
    header: "Reporting period",
    cell: (report) => <span className="font-medium">{formatMonth(report.month)}</span>,
  },
  {
    id: "seo",
    header: "SEO performance",
    cell: (report) => (
      <div className="flex flex-col">
        <span>{formatCompact(report.organicClicks)} organic clicks</span>
        <span className="text-xs text-muted-foreground">Avg. position {formatPosition(report.averagePosition)}</span>
      </div>
    ),
  },
  {
    id: "leads",
    header: "Leads",
    hideBelow: "sm",
    cell: (report) => (
      <div className="flex flex-col">
        <span>{formatNumber(report.metrics.genuine)} leads</span>
        <span className="text-xs text-muted-foreground">{formatNumber(report.metrics.organic)} of which organic</span>
      </div>
    ),
  },
  {
    id: "revenue",
    header: "Revenue (won)",
    hideBelow: "md",
    cell: (report) => (
      <div className="flex flex-col">
        <span>{formatCurrency(report.metrics.wonRevenue)}</span>
        <span className="text-xs text-muted-foreground">{formatNumber(report.metrics.won)} won deals</span>
      </div>
    ),
  },
  {
    id: "status",
    header: "Report status",
    cell: (report) => {
      const meta = REPORT_STATUS_META[report.status];
      return <StatusBadge tone={meta.tone} label={meta.label} />;
    },
  },
  {
    id: "download",
    header: "Download",
    align: "right",
    cell: (report) => {
      const monthLabel = formatMonth(report.month);
      return (
        <Button
          variant="outline"
          size="sm"
          aria-label={`Download ${monthLabel} report`}
          onClick={() => toast(`Report downloads are planned for Phase 2. No file was created for ${monthLabel}.`)}
        >
          <Download aria-hidden />
          Download
        </Button>
      );
    },
  },
];

export function MonthlyReportsTable({ reports }: { reports: MonthlyReport[] }) {
  const { leads } = useLeads();
  const rows = useMemo<ReportRow[]>(
    () => reports.map((report) => ({ ...report, metrics: computeLeadMetrics(leadsInMonth(leads, report.month)) })),
    [reports, leads],
  );

  return (
    <DataTable
      caption="Monthly reports, newest first, with SEO, lead and revenue summaries"
      columns={columns}
      rows={rows}
      getRowId={(report) => report.id}
      emptyTitle="No reports yet"
      emptyDescription="Reports appear here once a month has activity."
    />
  );
}
