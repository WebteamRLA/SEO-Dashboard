import type { ReactNode } from "react";
import { LeadsProvider } from "@/features/leads/leads-store";
import { getLeads } from "@/lib/data/leads";
import { getLeadPeople } from "@/lib/data/team";
import { requireSessionUser } from "@/server/auth/session";

/**
 * The pages that read leads (Overview, Leads, Revenue) share one leads store,
 * so a pipeline move shows everywhere at once. Only these pages load every
 * lead; the rest of the dashboard skips that query and its payload. The route
 * group adds nothing to the URLs.
 */
export default async function LeadPagesLayout({ children }: { children: ReactNode }) {
  const [sessionUser, leads, team] = await Promise.all([requireSessionUser(), getLeads(), getLeadPeople()]);

  return (
    <LeadsProvider initialLeads={leads} team={team} currentUser={{ id: sessionUser.id, name: sessionUser.name || sessionUser.email }}>
      {children}
    </LeadsProvider>
  );
}
