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
