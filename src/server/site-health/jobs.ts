import "server-only";
import { createDb, releaseDb } from "@/server/db/client";
import { accessToken } from "@/server/google/client";
import { getSearchConsoleSite } from "@/server/google/config";
import { runCrawl } from "./crawl";
import { inspectPages } from "./indexing";
import { fetchSitemapUrls } from "./sitemap";
import { fetchPageSpeed } from "./speed";
import type { IndexedPage, IndexingResult, SiteHealthKind } from "./types";

/**
 * Runs Site health jobs and stores each outcome as a SiteHealthRun. Called by
 * the daily/weekly cron and by an admin's "Run checks now". Never throws: a
 * failure is stored with a plain-language reason for the page to show.
 */

/** A run still marked "running" after this long died with its function (timeout, deploy). */
export const STALE_RUN_MS = 20 * 60_000;
/**
 * How long one invocation may keep starting work. Vercel stops a function after
 * 300 seconds; the rest covers requests already in flight (up to 30 s) and
 * storing the results.
 */
const INVOCATION_BUDGET_MS = 250_000;
/** Order within one invocation: quick and all-or-nothing first, indexing last since it can stop part-way. */
const ORDER: readonly SiteHealthKind[] = ["speed", "crawl", "indexing"];
/** Stored error text is kept short: it is shown to everyone who opens the page. */
const MAX_ERROR_CHARS = 300;

export function getPageSpeedKey(): string | null {
  return process.env.PAGESPEED_API_KEY?.trim() || null;
}

/** The pages from the latest finished indexing check, to carry forward and to choose what to refresh first. */
async function previousIndexing(): Promise<IndexedPage[]> {
  const db = createDb();
  try {
    const row = await db.siteHealthRun.findFirst({ where: { kind: "indexing", status: "ok" }, orderBy: { startedAt: "desc" } });
    const pages = (row?.result as unknown as IndexingResult | null)?.pages ?? [];
    // Runs stored before pages carried `checkedAt` count as checked when that run finished.
    const at = (row?.finishedAt ?? row?.startedAt)?.toISOString() ?? null;
    return pages.map((page) => ({ ...page, checkedAt: page.checkedAt ?? at }));
  } finally {
    await releaseDb(db);
  }
}

/**
 * The site's home page from the Search Console property: a URL-prefix property
 * is already one; a domain property ("sc-domain:example.com") becomes https://example.com/.
 */
export function homePage(property: string): string {
  const domain = /^sc-domain:(.+)$/i.exec(property.trim())?.[1];
  return domain ? `https://${domain.replace(/\/+$/, "")}/` : property;
}

async function runJob(kind: SiteHealthKind, property: string, deadline: number): Promise<unknown> {
  // URL Inspection needs the property as Search Console names it; everything else needs a web address.
  const siteUrl = homePage(property);
  if (kind === "speed") {
    const key = getPageSpeedKey();
    if (!key) throw new Error("PAGESPEED_API_KEY is not set, so the speed test cannot run.");
    return fetchPageSpeed(siteUrl, key, Math.min(120_000, Math.max(10_000, deadline - Date.now())));
  }
  if (kind === "crawl") return runCrawl(siteUrl, deadline);
  if (kind === "indexing") {
    const urls = await fetchSitemapUrls(siteUrl);
    // An empty list means the sitemap could not be read, not that there is nothing to index.
    if (urls.length === 0) throw new Error("No pages found in the site's sitemap.");
    return inspectPages(urls, property, accessToken, { previous: await previousIndexing(), deadline });
  }
  throw new Error(`Unknown check "${String(kind)}".`);
}

/**
 * Strings Postgres cannot store in JSONB (NUL, unpaired surrogates from a
 * page's odd entities) are cleaned, so one strange page cannot lose a whole run.
 */
function storable(value: unknown): object {
  return JSON.parse(
    JSON.stringify(value, (_key, item: unknown) =>
      typeof item === "string" ? item.replace(/\u0000/g, "").toWellFormed() : item,
    ),
  ) as object;
}

function reason(error: unknown): string {
  const message = error instanceof Error ? error.message : "The check failed.";
  return message.length > MAX_ERROR_CHARS ? `${message.slice(0, MAX_ERROR_CHARS - 1)}…` : message;
}

/**
 * Claims the right to run `kind`: marks dead runs as failed, then creates a
 * "running" row unless one is live. A transaction-scoped advisory lock makes
 * check-then-create atomic, so a cron firing as an admin clicks starts one run.
 */
async function claim(kind: SiteHealthKind): Promise<string | null> {
  const db = createDb();
  try {
    return await db.$transaction(async (tx) => {
      // The lock function returns void, which Prisma cannot read back; select a plain 1 instead.
      await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtext(${`site_health:${kind}`}))) AS lock`;
      const staleBefore = new Date(Date.now() - STALE_RUN_MS);
      await tx.siteHealthRun.updateMany({
        where: { kind, status: "running", startedAt: { lte: staleBefore } },
        data: { status: "error", error: "The check stopped before finishing (it ran past the time limit).", finishedAt: new Date() },
      });
      const live = await tx.siteHealthRun.findFirst({ where: { kind, status: "running" }, select: { id: true } });
      if (live) return null;
      const id = crypto.randomUUID();
      await tx.siteHealthRun.create({ data: { id, kind } });
      return id;
    });
  } finally {
    await releaseDb(db);
  }
}

async function finish(id: string, data: { status: "ok"; result: object } | { status: "error"; error: string }): Promise<void> {
  const db = createDb();
  try {
    await db.siteHealthRun.update({ where: { id }, data: { ...data, finishedAt: new Date() } });
  } finally {
    await releaseDb(db);
  }
}

async function runOne(kind: SiteHealthKind, deadline: number): Promise<"ok" | "error" | "skipped"> {
  let id: string | null;
  try {
    id = await claim(kind);
  } catch {
    return "error";
  }
  if (!id) return "skipped";

  let outcome: { status: "ok"; result: object } | { status: "error"; error: string };
  try {
    outcome = { status: "ok", result: storable(await runJob(kind, getSearchConsoleSite(), deadline)) };
  } catch (error) {
    outcome = { status: "error", error: reason(error) };
  }
  try {
    await finish(id, outcome);
    return outcome.status;
  } catch {
    // Storing the result failed (connection, size). Record that much, without the database's own message.
    await finish(id, { status: "error", error: "The check finished but its results could not be saved." }).catch(() => undefined);
    return "error";
  }
}

/** Runs `kinds` one after another within one invocation's time budget. */
export async function runSiteHealthJobs(kinds: readonly SiteHealthKind[]): Promise<Record<string, string>> {
  const deadline = Date.now() + INVOCATION_BUDGET_MS;
  const results: Record<string, string> = {};
  for (const kind of ORDER.filter((item) => kinds.includes(item))) results[kind] = await runOne(kind, deadline);
  return results;
}
