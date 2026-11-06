"use client";

import { StatusBadge } from "@/components/data/status-badge";
import { DataTable, type Column } from "@/components/data/data-table";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { MonitoredForm } from "@/lib/types";
import { FORM_MONITOR_META } from "./site-health-meta";

const columns: Column<MonitoredForm>[] = [
  {
    id: "name",
    header: "Form name",
    cell: (form) => <span className="font-medium">{form.name}</span>,
  },
  {
    id: "url",
    header: "URL",
    hideBelow: "sm",
    cell: (form) => <span className="break-all text-muted-foreground">{form.url}</span>,
  },
  {
    id: "status",
    header: "Form status",
    cell: (form) => {
      const meta = FORM_MONITOR_META[form.status];
      return <StatusBadge tone={meta.tone} label={meta.label} />;
    },
  },
  {
    id: "checked",
    header: "Last checked",
    hideBelow: "md",
    cell: (form) => formatDateTime(form.lastChecked),
  },
  {
    id: "failed",
    header: "Failed submissions",
    align: "right",
    cell: (form) => formatNumber(form.failedSubmissions),
  },
  {
    id: "monitoring",
    header: "Monitoring status",
    hideBelow: "lg",
    cell: (form) => (form.monitoring ? "On" : "Paused"),
  },
];

export function FormHealthTable({ forms }: { forms: MonitoredForm[] }) {
  return (
    <DataTable
      caption="Website forms, their status and failed submissions"
      columns={columns}
      rows={forms}
      getRowId={(form) => form.id}
      emptyTitle="No forms to show"
      emptyDescription="Forms appear here once they are identified."
    />
  );
}
