import type { TeamMember } from "@/lib/types";

/** Fictional colleagues. `.example` is reserved, so no real inbox is implied. */
export const CURRENT_USER_ID = "courtney";

export const teamMembers: TeamMember[] = [
  { id: "courtney", name: "Courtney", email: "courtney@rla.example", role: "Owner", title: "Managing Director", status: "active" },
  { id: "maya", name: "Maya Okafor", email: "maya@rla.example", role: "Admin", title: "SEO Lead", status: "active" },
  { id: "daniel", name: "Daniel Reyes", email: "daniel@rla.example", role: "Member", title: "Content Writer", status: "active" },
  { id: "priya", name: "Priya Nair", email: "priya@rla.example", role: "Member", title: "Technical SEO Specialist", status: "active" },
  { id: "tom", name: "Tom Whitfield", email: "tom@rla.example", role: "Member", title: "On-Page Specialist", status: "active" },
  { id: "elena", name: "Elena Marsh", email: "elena@rla.example", role: "Viewer", title: "Account Manager", status: "invited" },
];
