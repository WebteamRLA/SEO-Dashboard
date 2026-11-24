import { connection } from "next/server";
import { AppShell } from "@/components/layout/app-shell";
import { getToday } from "@/lib/data/calendar";
import { getNotificationFeed } from "@/lib/data/notifications";
import { requireSessionUser } from "@/server/auth/session";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  // Every dashboard page is per-request: the shell reads the reporting period, and pages
  // need the signed-in user.
  await connection();

  // Before any data loads: no session, no dashboard. This runs above the page's
  // loading boundary, so an anonymous request gets a real redirect response.
  const sessionUser = await requireSessionUser();
  const today = await getToday();

  // Not awaited: the bell streams in when Teamwork and the database answer, without
  // holding up the page. Leads for the pages that need them load in (lead-pages)/layout.
  const notifications = getNotificationFeed(today);

  return (
    <AppShell user={sessionUser} today={today} notifications={notifications}>
      {children}
    </AppShell>
  );
}
