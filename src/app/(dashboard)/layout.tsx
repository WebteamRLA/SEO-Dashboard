import { connection } from "next/server";
import { AppShell } from "@/components/layout/app-shell";
import { LeadsProvider } from "@/features/leads/leads-store";
import { getAvailableMonths, getDefaultMonth } from "@/lib/data/calendar";
import { getLeads } from "@/lib/data/leads";
import { getNotifications } from "@/lib/data/operations";
import { getCurrentUser, getTeamMembers } from "@/lib/data/team";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  // Every dashboard page is per-request: the shell reads `?month=`, and live
  // data will require a session. This also keeps useSearchParams on the server.
  await connection();

  const [leads, team, user, months, defaultMonth, notifications] = await Promise.all([
    getLeads(),
    getTeamMembers(),
    getCurrentUser(),
    getAvailableMonths(),
    getDefaultMonth(),
    getNotifications(),
  ]);

  return (
    <LeadsProvider initialLeads={leads} team={team} currentUser={user}>
      <AppShell
        user={user}
        months={months}
        defaultMonth={defaultMonth}
        notifications={notifications}
      >
        {children}
      </AppShell>
    </LeadsProvider>
  );
}
