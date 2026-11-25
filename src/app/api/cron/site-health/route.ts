import { runSiteHealthJobs } from "@/server/site-health/jobs";
import type { SiteHealthKind } from "@/server/site-health/types";

/**
 * Scheduled Site health checks (vercel.json crons). "daily" runs the speed test
 * and the indexing check; "weekly" runs the full site check. Vercel sends
 * `Authorization: Bearer $CRON_SECRET`; without that secret set, nothing runs.
 */
export const maxDuration = 300;

/** Compares in time that does not depend on where the strings differ, so the secret cannot be guessed by timing. */
function sameText(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let difference = left.length ^ right.length;
  for (let i = 0; i < right.length; i++) difference |= (left[i] ?? 0) ^ right[i]!;
  return difference === 0;
}

const TASKS: Record<string, SiteHealthKind[]> = { daily: ["speed", "indexing"], weekly: ["crawl"] };

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET is not set." }, { status: 503 });
  if (!sameText(request.headers.get("authorization") ?? "", `Bearer ${secret}`)) return new Response("Unauthorized", { status: 401 });

  const kinds = TASKS[new URL(request.url).searchParams.get("task") ?? ""];
  if (!kinds) return Response.json({ error: "Unknown task. Use ?task=daily or ?task=weekly." }, { status: 400 });

  return Response.json(await runSiteHealthJobs(kinds));
}
