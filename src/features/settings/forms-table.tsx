"use client";

import { toast } from "sonner";
import { StatusBadge } from "@/components/data/status-badge";
import { DataTable, type Column } from "@/components/data/data-table";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import type { FormConnection } from "@/lib/types";
import { FORM_STATUS_META } from "./settings-meta";

const columns: Column<FormConnection>[] = [
  { id: "name", header: "Form name", cell: (form) => <span className="font-medium">{form.name}</span>, sortValue: (form) => form.name },
  { id: "url", header: "Website URL", hideBelow: "sm", cell: (form) => <span className="text-muted-foreground">{form.url}</span>, sortValue: (form) => form.url },
  {
    id: "status",
    header: "Connection status",
    cell: (form) => {
      const meta = FORM_STATUS_META[form.status];
      return <StatusBadge tone={meta.tone} label={meta.label} />;
    },
    sortValue: (form) => form.status,
  },
  { id: "last", header: "Last submission", hideBelow: "md", cell: (form) => formatDateTime(form.lastSubmission) },
  {
    id: "test",
    header: "Test",
    align: "right",
    cell: (form) => (
      <Button
        variant="outline"
        size="sm"
        aria-label={`Test ${form.name}`}
        onClick={() => toast("Test submissions become available once forms are connected. Nothing was sent.")}
      >
        Test
      </Button>
    ),
  },
];

export function FormsTable({ forms }: { forms: FormConnection[] }) {
  return (
    <DataTable
      caption="Website forms and their connection status"
      columns={columns}
      rows={forms}
      getRowId={(form) => form.id}
      emptyTitle="No forms yet"
      emptyDescription="Forms appear here once they are identified."
    />
  );
}
