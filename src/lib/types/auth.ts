export const ROLES = ["admin", "manager", "member"] as const;
export type Role = (typeof ROLES)[number];

/** The signed-in person, as the UI sees them. */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  /** Google profile photo URL, when there is one. */
  image: string | null;
  role: Role;
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  manager: "Manager",
  member: "Member",
};

/** One row on Settings > Team & Access. */
export interface AccessMember {
  /** Lower-case. Identifies the row. */
  email: string;
  /** From Google, once they have signed in. */
  name: string | null;
  role: Role;
  /** Active once they have signed in at least once. */
  status: "active" | "invited";
  /** An admin set in AUTH_BOOTSTRAP_ADMINS, which the page cannot remove. */
  bootstrap: boolean;
  invitedAt: string | null;
}
