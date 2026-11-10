import type { Metadata } from "next";
import { TeamMembers } from "@/features/settings/team-members";
import { getAccessMembers } from "@/lib/data/team";
import { requireSessionUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Team & Access" };

export default async function TeamPage() {
  const [user, members] = await Promise.all([requireSessionUser(), getAccessMembers()]);
  return (
    <TeamMembers
      members={members}
      currentEmail={user.email.toLowerCase()}
      canManage={user.role === "admin"}
    />
  );
}
