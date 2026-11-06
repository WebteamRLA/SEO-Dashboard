import { StatusBadge } from "@/components/data/status-badge";
import type { AiAgent, StatusTone } from "@/lib/types";

const STATUS: Record<AiAgent["status"], { label: string; tone: StatusTone }> = {
  planned: { label: "Planned", tone: "neutral" },
  "in-design": { label: "In design", tone: "info" },
};

export function AgentStatusBadge({ status }: { status: AiAgent["status"] }) {
  const { label, tone } = STATUS[status];
  return <StatusBadge tone={tone} label={label} />;
}
