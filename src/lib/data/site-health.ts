import "server-only";
import { requireSessionUser } from "@/server/auth/session";
import { createDb, releaseDb } from "@/server/db/client";
import { getPageSpeedKey, STALE_RUN_MS } from "@/server/site-health/jobs";
import type {
  CrawlResult,
  IndexBucket,
  IndexedPage,
  IndexingResult,
  IssueType,
  SiteHealthKind,
  SiteIssueGroup,
  SpeedResult,
} from "@/server/site-health/types";

export type {
  CrawlResult,
  IndexBucket,
  IndexedPage,
  IssueType,
  IssuePriority,
  SiteHealthKind,
  SiteIssueGroup,
  SpeedResult,
  Vital,
  VitalCategory,
} from "@/server/site-health/types";

export type TrimmedIssueGroup = SiteIssueGroup & { total: number };

/** One kind of check as the page needs it: the latest result, and why the newest run failed if it did. */
export interface CheckState<T> {
  latest: { result: T; finishedAt: string } | null;
  /** The newest run failed after the latest good one. */
  error: { message: string; at: string } | null;
  running: boolean;
}

export interface SiteHealthData {
  speed: CheckState<SpeedResult> & {
    /** An older score to compare with ("+12 since Oct 1"), when there is one at least a week old. */
    baseline: { score: number; at: string } | null;
    /** PAGESPEED_API_KEY is set. */
    configured: boolean;
  };
  /** Counts, plus the pages Google has seen but not indexed; the indexed rows stay on the server. */
  indexing: CheckState<{ total: number; counts: Record<IndexBucket, number>; notIndexed: IndexedPage[]; notIndexedTotal: number }>;
  /** Issue page lists are cut to ISSUE_PAGE_LIMIT; `total` on each group keeps the real count. */
  crawl: CheckState<Omit<CrawlResult, "issues"> & { issues: TrimmedIssueGroup[] }> & {
    /** Issues on pages found by the previous check that the latest check no longer finds. */
    fixed: { count: number; since: string } | null;
    /** Issue types the previous check did not find: shown as "New". Empty when there is no previous check. */
    newTypes: IssueType[];
    /** Issue types the previous check found and the latest no longer does: shown as fixed. */
    fixedGroups: TrimmedIssueGroup[];
  };
}

/** A run without its (possibly large) result: enough to tell what is running or failed. */
type Status = { id: string; status: string; error: string | null; startedAt: Date; finishedAt: Date | null };

function state<T>(rows: readonly Status[], latestResult: T | null): CheckState<T> {
  const ok = rows.find((row) => row.status === "ok");
  const newest = rows[0];
  const failed = newest && newest.status === "error" && (!ok || newest.startedAt > ok.startedAt) ? newest : null;
  const running = rows.some((row) => row.status === "running" && Date.now() - row.startedAt.getTime() < STALE_RUN_MS);
  return {
    latest: ok && latestResult !== null ? { result: latestResult, finishedAt: (ok.finishedAt ?? ok.startedAt).toISOString() } : null,
    error: failed ? { message: failed.error ?? "The check failed.", at: (failed.finishedAt ?? failed.startedAt).toISOString() } : null,
    running,
  };
}

/**
 * Response time swings from one run to the next (network, server load), so a
 * page that was slow last week and not this week was not "fixed". These types
 * are left out of fixed and new.
 */
const VOLATILE = new Set<IssueType>(["slow-response"]);
const stable = (issues: readonly SiteIssueGroup[]) => issues.filter((group) => !VOLATILE.has(group.type));

/**
 * Types whose detail says which problem it is (the broken target, where a page
 * redirects, the shared title). For the rest the detail is a measurement ("3
 * images"), so a changed measurement is the same issue, not a fix.
 */
const DETAIL_IS_IDENTITY = new Set<IssueType>(["broken-link", "sitemap-redirect", "canonical-elsewhere", "duplicate-title", "duplicate-description"]);

const instanceKey = (type: IssueType, url: string, detail: string | null) =>
  DETAIL_IS_IDENTITY.has(type) ? `${type}|${url}|${detail ?? ""}` : `${type}|${url}`;

/**
 * Issue instances in `previous` that `latest` no longer has, counting only pages
 * the latest check read successfully (`checked`): a page that timed out this
 * week was not re-checked, so its issues are not fixed. Without `checked`
 * (older runs) every page counts as checked.
 */
export function countFixed(previous: readonly SiteIssueGroup[], latest: readonly SiteIssueGroup[], checked?: ReadonlySet<string>): number {
  const now = new Set(stable(latest).flatMap((group) => group.pages.map((page) => instanceKey(group.type, page.url, page.detail))));
  const fixed = new Set<string>();
  for (const group of stable(previous)) {
    for (const page of group.pages) {
      const key = instanceKey(group.type, page.url, page.detail);
      if (!now.has(key) && (!checked || checked.has(page.url))) fixed.add(key);
    }
  }
  return fixed.size;
}

const WEEK_MS = 7 * 86_400_000;
/** How far back the speed comparison looks. */
const BASELINE_MS = 90 * 86_400_000;
/** Pages sent to the browser per issue; the page shows this many and counts the rest. */
export const ISSUE_PAGE_LIMIT = 50;

/** Keeps the page list short for the browser; `total` keeps the real count. */
function trimmed(group: SiteIssueGroup): SiteIssueGroup & { total: number } {
  return { ...group, total: group.pages.length, pages: group.pages.slice(0, ISSUE_PAGE_LIMIT) };
}

const STATUS_FIELDS = { id: true, status: true, error: true, startedAt: true, finishedAt: true } as const;

export async function getSiteHealth(): Promise<SiteHealthData> {
  await requireSessionUser();
  const db = createDb();
  try {
    const recent = (kind: SiteHealthKind) =>
      db.siteHealthRun.findMany({ where: { kind }, orderBy: { startedAt: "desc" }, take: 10, select: STATUS_FIELDS });
    const resultOf = async (id: string | undefined) =>
      id ? ((await db.siteHealthRun.findUnique({ where: { id }, select: { result: true } }))?.result as unknown) ?? null : null;

    const [speedRows, indexingRows, crawlRows, oldestSpeed] = await Promise.all([
      recent("speed"),
      recent("indexing"),
      recent("crawl"),
      db.siteHealthRun.findFirst({
        where: { kind: "speed", status: "ok", startedAt: { gt: new Date(Date.now() - BASELINE_MS), lt: new Date(Date.now() - WEEK_MS) } },
        orderBy: { startedAt: "asc" },
        select: { result: true, startedAt: true },
      }),
    ]);
    const okCrawls = crawlRows.filter((row) => row.status === "ok");
    const [speedResult, indexingResult, latestCrawl, previousCrawl] = (await Promise.all([
      resultOf(speedRows.find((row) => row.status === "ok")?.id),
      resultOf(indexingRows.find((row) => row.status === "ok")?.id),
      resultOf(okCrawls[0]?.id),
      resultOf(okCrawls[1]?.id),
    ])) as [SpeedResult | null, IndexingResult | null, CrawlResult | null, CrawlResult | null];

    const speed = state(speedRows, speedResult);
    const indexing = state(
      indexingRows,
      indexingResult
        ? {
            total: indexingResult.total,
            counts: indexingResult.counts,
            notIndexed: indexingResult.pages
              .filter((page) => page.bucket === "crawled-not-indexed" || page.bucket === "discovered-not-indexed")
              .slice(0, ISSUE_PAGE_LIMIT),
            notIndexedTotal: indexingResult.counts["crawled-not-indexed"] + indexingResult.counts["discovered-not-indexed"],
          }
        : null,
    );

    const latestIssues = latestCrawl?.issues ?? [];
    const previousIssues = previousCrawl?.issues ?? null;
    const checked = latestCrawl?.okPages ? new Set(latestCrawl.okPages) : undefined;
    const previousRow = okCrawls[1];
    const fixed =
      previousRow && previousIssues
        ? { count: countFixed(previousIssues, latestIssues, checked), since: (previousRow.finishedAt ?? previousRow.startedAt).toISOString() }
        : null;
    const latestTypes = new Set(latestIssues.map((group) => group.type));
    const previousTypes = new Set(previousIssues?.map((group) => group.type) ?? []);
    const newTypes = previousIssues ? stable(latestIssues).filter((group) => !previousTypes.has(group.type)).map((group) => group.type) : [];
    // Fixed rows are not expandable, so they carry no page list, only the count.
    const fixedGroups = previousIssues
      ? stable(previousIssues)
          .filter((group) => !latestTypes.has(group.type) && (!checked || group.pages.every((page) => checked.has(page.url))))
          .map((group) => ({ ...trimmed(group), pages: [] }))
      : [];

    const crawl = state(crawlRows, latestCrawl ? { ...latestCrawl, okPages: undefined, issues: latestCrawl.issues.map(trimmed) } : null);

    return {
      speed: {
        ...speed,
        baseline: oldestSpeed ? { score: (oldestSpeed.result as unknown as SpeedResult).score, at: oldestSpeed.startedAt.toISOString() } : null,
        configured: getPageSpeedKey() !== null,
      },
      indexing,
      crawl: { ...crawl, fixed, newTypes, fixedGroups },
    };
  } finally {
    await releaseDb(db);
  }
}
