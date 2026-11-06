import "server-only";
import type { TeamMember } from "@/lib/types";
import { CURRENT_USER_ID, teamMembers } from "@/mocks/team";

export async function getTeamMembers(): Promise<TeamMember[]> {
  return teamMembers;
}

/** Sample session. Replaced by the authenticated user. */
export async function getCurrentUser(): Promise<TeamMember> {
  const user = teamMembers.find((member) => member.id === CURRENT_USER_ID);
  if (!user) throw new Error("The sample session user is missing from the team list.");
  return user;
}
