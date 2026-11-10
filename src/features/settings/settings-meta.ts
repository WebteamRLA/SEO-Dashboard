import type { StatusTone, TeamMember } from "@/lib/types";

export const MEMBER_STATUS_META: Record<TeamMember["status"], { label: string; tone: StatusTone }> = {
  active: { label: "Active", tone: "good" },
  invited: { label: "Invited", tone: "warning" },
};
