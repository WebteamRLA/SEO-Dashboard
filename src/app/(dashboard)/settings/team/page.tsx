import type { Metadata } from "next";
import { TeamMembers } from "@/features/settings/team-members";
import { getTeamMembers } from "@/lib/data/team";

export const metadata: Metadata = { title: "Team & Access" };

export default async function TeamPage() {
  const members = await getTeamMembers();
  return <TeamMembers initialMembers={members} />;
}
