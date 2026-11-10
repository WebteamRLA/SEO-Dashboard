import { connection } from "next/server";
import { AppShell } from "@/components/layout/app-shell";
import { LeadsProvider } from "@/features/leads/leads-store";
import { getToday } from "@/lib/data/calendar";
import { getLeads } from "@/lib/data/leads";
import { getNotifications } from "@/lib/data/operations";
import { getCurrentUser, getTeamMembers } from "@/lib/data/team";
import { requireSessionUser } from "@/server/auth/session";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  // Every dashboard page is per-request: the shell reads the reporting period, and pages
  // need the signed-in user.
  await connection();

  // Before any data loads: no session, no dashboard. This runs above the page's
  // loading boundary, so an anonymous request gets a real redirect response.
  const sessionUser = await requireSessionUser();

  const [leads, team, sampleUser, today, notifications] = await Promise.all([
    getLeads(),
    getTeamMembers(),
    // Leads are still sample data, attributed to the sample team, so the lead
    // store keeps its sample author until leads are stored for real.
    getCurrentUser(),
    getToday(),
    getNotifications(),
  ]);

  return (
    <LeadsProvider initialLeads={leads} team={team} currentUser={sampleUser}>
      <AppShell
        user={sessionUser}
        today={today}
        notifications={notifications}
      >
        {children}
      </AppShell>
    </LeadsProvider>
  );
}
