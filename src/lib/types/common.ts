/** Calendar month in `YYYY-MM` form, e.g. `2026-10`. */
export type MonthKey = string;

/** Date-only value in `YYYY-MM-DD` form. */
export type ISODate = string;

/** Full timestamp in ISO 8601 form. */
export type ISODateTime = string;

/** Delivery phase. Mirrors the approved P1 / P2 / P3 roadmap. */
export type Phase = "P1" | "P2" | "P3";

/** Semantic state of a badge. Maps to the reserved status colours. */
export type StatusTone =
  | "good"
  | "warning"
  | "serious"
  | "critical"
  | "info"
  | "neutral";

/** A completed-of-total measure. Percent is 0-100 and rounded. */
export interface Progress {
  completed: number;
  total: number;
  percent: number;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  title: string;
  status: "active" | "invited";
}

export type TeamRole = "Owner" | "Admin" | "Member" | "Viewer";
