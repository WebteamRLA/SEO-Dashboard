"use client";

import Image from "next/image";
import { useState } from "react";
import { Check, ExternalLink, FileText, Printer } from "lucide-react";
import { PeriodLink } from "@/components/layout/period-link";
import { Panel } from "@/components/data/panel";
import { DataTable, type Column } from "@/components/data/data-table";
import { MonthPicker } from "@/components/data/month-picker";
import { SegmentedControl } from "@/components/data/segmented-control";
import { StatusBadge } from "@/components/data/status-badge";
import { buttonVariants } from "@/components/ui/button";
import type { ReportListRow } from "@/lib/data/reports";
import { formatMonth, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { REPORT_STATUS_META } from "./reports-meta";

const count = (value: number | null) => (value === null ? "—" : formatNumber(value));

/** The sections every monthly report contains (see report-view and report-sections). */
const INCLUDED = [
  "Summary",
  "Search performance",
  "Website traffic",
  "Enquiries",
  "Leads",
  "Work completed",
  "Strategy progress",
];

const COLUMNS: Column<ReportListRow>[] = [
  {
    id: "report",
    header: "Report",
    cell: () => (
      <span className="flex items-center gap-3 font-medium text-ink">
        <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-ink-quiet">
          <FileText className="size-4" />
        </span>
        Monthly report
      </span>
    ),
  },
  {
    id: "month",
    header: "Period",
    cell: (row) => (
      <PeriodLink href={`/reports/${row.month}`} className="text-[13px] text-ink-body hover:text-primary hover:underline">
        {formatMonth(row.month)}
      </PeriodLink>
    ),
    sortValue: (row) => row.month,
  },
  {
    id: "status",
    header: "Status",
    cell: (row) => (
      <StatusBadge tone={REPORT_STATUS_META[row.status].tone} label={row.status === "ready" ? "Final" : REPORT_STATUS_META[row.status].label} />
    ),
    sortValue: (row) => row.status,
  },
  { id: "clicks", header: "Organic clicks", align: "right", hideBelow: "xl", cell: (row) => count(row.organicClicks), sortValue: (row) => row.organicClicks },
  { id: "sessions", header: "Sessions", align: "right", hideBelow: "xl", cell: (row) => count(row.sessions), sortValue: (row) => row.sessions },
  {
    id: "organic",
    header: "Organic sessions",
    align: "right",
    hideBelow: "xl",
    cell: (row) => count(row.organicSessions),
    sortValue: (row) => row.organicSessions,
  },
  { id: "leads", header: "Leads", align: "right", hideBelow: "xl", cell: (row) => count(row.leads), sortValue: (row) => row.leads },
  {
    id: "open",
    header: "Open",
    srOnlyHeader: true,
    align: "right",
    width: "6.5rem",
    cell: (row) => (
      <PeriodLink
        href={`/reports/${row.month}`}
        aria-label={`Open ${formatMonth(row.month)} report`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-ink-body")}
      >
        <ExternalLink aria-hidden />
        Open
      </PeriodLink>
    ),
  },
];

function PreviewTile({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-lg border border-line p-2.5">
      <span className="text-[10px] leading-tight text-ink-quiet">{label}</span>
      <span className="text-lg font-semibold tabular-nums text-ink">{count(value)}</span>
    </div>
  );
}

function SkeletonLines({ title, widths }: { title: string; widths: string[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold text-ink">{title}</span>
      {widths.map((width, index) => (
        <div key={index} className="h-1.5 rounded-[3px] bg-line" style={{ width }} />
      ))}
    </div>
  );
}

export function ReportList({ rows }: { rows: ReportListRow[] }) {
  const sorted = [...rows].sort((a, b) => b.month.localeCompare(a.month));
  const [month, setMonth] = useState(sorted[0]?.month ?? "");
  const selected = sorted.find((row) => row.month === month);

  return (
    <div className="flex flex-col gap-6">
      {selected ? (
        <Panel
          id="create-report"
          title="Create a report"
          description="A PDF summary of results and work, ready to share with leadership"
          bodyClassName="grid gap-8 py-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]"
        >
          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink-body">Report type</span>
              <SegmentedControl label="Report type" options={[{ value: "monthly", label: "Monthly" }]} value="monthly" className="self-start" />
            </div>
            <div className="flex flex-col gap-1.5">
              <span id="report-period-label" className="text-[13px] font-medium text-ink-body">
                Period
              </span>
              <MonthPicker
                value={month}
                available={sorted.map((row) => row.month)}
                onChange={setMonth}
                labelledBy="report-period-label"
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-medium text-ink-body">Included in the report</span>
              <ul className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-[13px] text-ink-body">
                    <Check aria-hidden className="size-3.5 shrink-0 text-[#16A34A]" strokeWidth={2.6} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <PeriodLink href={`/reports/${selected.month}`} className={cn(buttonVariants({ size: "lg" }), "px-4 font-semibold")}>
                <FileText aria-hidden />
                Open report
              </PeriodLink>
              <PeriodLink href={`/reports/${selected.month}`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "px-3.5 text-ink-body")}>
                <Printer aria-hidden />
                Print / Save as PDF
              </PeriodLink>
              <span className="text-xs text-ink-quiet">PDF · from the report page</span>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.04em] text-ink-quiet">Preview</span>
            <div
              role="img"
              aria-label={`Preview of the ${formatMonth(selected.month)} monthly report`}
              className="flex flex-col gap-3.5 rounded-lg border border-input bg-card p-6 shadow-[0_8px_24px_#1118270F]"
            >
              <Image src="/rla-logo.svg" alt="" width={120} height={24} className="h-auto w-[120px]" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[17px] font-bold text-ink">Monthly report</span>
                <span className="text-[11px] text-ink-quiet">{formatMonth(selected.month)} · SEO report</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <PreviewTile label="Organic clicks" value={selected.organicClicks} />
                <PreviewTile label="Sessions" value={selected.sessions} />
                <PreviewTile label="Leads" value={selected.leads} />
              </div>
              <SkeletonLines title="Search performance" widths={["92%", "78%", "85%"]} />
              <SkeletonLines title="Work completed" widths={["70%", "60%"]} />
            </div>
          </div>
        </Panel>
      ) : null}

      <Panel
        id="reports"
        title="Recent reports"
        description="Reports created before, ready to open again"
        flush
      >
        <DataTable
          bare
          caption="Recent reports"
          columns={COLUMNS}
          rows={rows}
          getRowId={(row) => row.month}
          defaultSort={{ columnId: "month", direction: "desc" }}
          pageSize={12}
        />
      </Panel>
    </div>
  );
}
