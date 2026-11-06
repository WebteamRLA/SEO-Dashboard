import type { FormConnection, Integration, StatusTone, TeamMember, TeamRole } from "@/lib/types";

/** Ownership is held by one person and is never granted through an invite. */
export const INVITABLE_ROLES: readonly TeamRole[] = ["Admin", "Member", "Viewer"];

export function isInvitableRole(value: string): value is TeamRole {
  return (INVITABLE_ROLES as readonly string[]).includes(value);
}

export const INTEGRATION_STATUS_META: Record<Integration["status"], { label: string; tone: StatusTone }> = {
  connected: { label: "Connected", tone: "good" },
  "not-connected": { label: "Not connected", tone: "neutral" },
  "needs-confirmation": { label: "Needs confirmation", tone: "warning" },
};

export const FORM_STATUS_META: Record<FormConnection["status"], { label: string; tone: StatusTone }> = {
  connected: { label: "Connected", tone: "good" },
  "not-connected": { label: "Not connected", tone: "neutral" },
};

export const MEMBER_STATUS_META: Record<TeamMember["status"], { label: string; tone: StatusTone }> = {
  active: { label: "Active", tone: "good" },
  invited: { label: "Invited", tone: "warning" },
};
