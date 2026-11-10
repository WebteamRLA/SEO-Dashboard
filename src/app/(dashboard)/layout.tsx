import { connection } from "next/server";
import { AppShell } from "@/components/layout/app-shell";
import { LeadsProvider } from "@/features/leads/leads-store";
import { getToday } from "@/lib/data/calendar";
import { getLeads } from "@/lib/data/leads";
import { getNotificationFeed } from "@/lib/data/notifications";
import { getLeadPeople } from "@/lib/data/team";
import { requireSessionUser } from "@/server/auth/session";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  // Every dashboard page is per-request: the shell reads the reporting period, and pages
  // need the signed-in user.
  await connection();

  // Before any data loads: no session, no dashboard. This runs above the page's
  // loading boundary, so an anonymous request gets a real redirect response.
  const sessionUser = await requireSessionUser();

  const [leads, team, today] = await Promise.all([getLeads(), getLeadPeople(), getToday()]);

  // Not awaited: the bell streams in when Teamwork answers, without holding up the page.
  const notifications = getNotificationFeed(leads, today);

  return (
    <LeadsProvider initialLeads={leads} team={team} currentUser={{ id: sessionUser.id, name: sessionUser.name || sessionUser.email }}>
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
