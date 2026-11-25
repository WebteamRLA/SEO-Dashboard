"use server";

import { after } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { runSiteHealthJobs } from "./jobs";

/**
 * Starts the Site health checks now instead of waiting for the schedule. Admins
 * only. The checks run after the response (a full site check takes a few
 * minutes), so the page shows them as running and picks up the results on reload.
 */
export async function runSiteHealthNow(): Promise<{ status: "started" | "error"; message?: string }> {
  const user = await getSessionUser();
  if (user?.role !== "admin") return { status: "error", message: "Only admins can run the site checks." };
  after(() => runSiteHealthJobs(["speed", "crawl", "indexing"]));
  return { status: "started" };
}
