import type { ReportStatus, StatusTone } from "@/lib/types";

export const REPORT_STATUS_META: Record<ReportStatus, { label: string; tone: StatusTone }> = {
  draft: { label: "Draft", tone: "neutral" },
  ready: { label: "Ready", tone: "info" },
  sent: { label: "Sent", tone: "good" },
};
