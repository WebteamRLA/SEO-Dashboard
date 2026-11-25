"use client";

import { Fragment, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { MetricCard, MetricGrid } from "@/components/data/metric-card";
import { Panel } from "@/components/data/panel";
import type {
  IndexBucket,
  IssuePriority,
  SiteHealthData,
  TrimmedIssueGroup,
  Vital,
  VitalCategory,
} from "@/lib/data/site-health";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { shortenMiddle } from "@/features/traffic/paths";

const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;

/** "/blog/x/" for a URL on the same host as `page`; another host keeps its host, so it does not read as the site's own. */
function displayPath(url: string, page?: string): string {
  try {
    const parsed = new URL(url);
    const path = `${parsed.pathname}${parsed.search}` || "/";
    const sameHost = !page || new URL(page).hostname.replace(/^www\./, "") === parsed.hostname.replace(/^www\./, "");
    return sameHost ? path : `${parsed.hostname}${path}`;
  } catch {
    return url;
  }
}

const isWebUrl = (url: string) => /^https?:\/\//i.test(url);

function Quiet({ children }: { children: ReactNode }) {
  return <p className="py-2 text-[13px] text-ink-quiet">{children}</p>;
}

/**
 * Shown above results that exist: a newer run is under way, or failed. Without
 * it, a revoked key would quietly leave last week's figures on screen.
 */
function RunStatus({ error, running }: { error: { message: string; at: string } | null; running: boolean }) {
  if (running) return <p className="mb-3 text-xs text-ink-quiet">A new check is running; these are the previous results.</p>;
  if (error) {
    return (
      <p className="mb-3 text-xs text-tone-critical-fg">
        The latest check on {formatDate(error.at)} failed: {error.message} Showing the previous results.
      </p>
    );
  }
  return null;
}

function CheckNotice({ error, running, empty }: { error: { message: string; at: string } | null; running: boolean; empty: string }) {
  if (running) return <Quiet>Checking now. Results appear here in a few minutes.</Quiet>;
  if (error) {
    return (
      <p className="py-2 text-[13px] text-tone-critical-fg">
        The last check on {formatDate(error.at)} failed: {error.message}
      </p>
    );
  }
  return <Quiet>{empty}</Quiet>;
}

// ---------------------------------------------------------------- Core Web Vitals

const CATEGORY_STYLE: Record<VitalCategory, { label: string; className: string }> = {
  good: { label: "Good", className: "bg-tone-good-bg text-tone-good-fg" },
  "needs-improvement": { label: "Needs work", className: "bg-[#FEF3C7] text-[#92400E]" },
  poor: { label: "Poor", className: "bg-[#FEE2E2] text-[#B91C1C]" },
};

const VITALS = [
  { key: "lcp", name: "Loading", meaning: "Largest content shows", good: "Good is under 2.5 s", bounds: [2500, 4000] },
  { key: "inp", name: "Responsiveness", meaning: "Reacts to a tap", good: "Good is under 200 ms", bounds: [200, 500] },
  { key: "cls", name: "Visual stability", meaning: "Layout barely shifts", good: "Good is under 0.1", bounds: [0.1, 0.25] },
] as const;

function formatVital(key: "lcp" | "inp" | "cls", value: number): string {
  if (key === "cls") return value.toFixed(2);
  if (key === "inp") return `${formatNumber(Math.round(value))} ms`;
  return `${(value / 1000).toFixed(1)} s`;
}

/** Where a value sits on the green / amber / red scale (50% / 30% / 20% wide), as a percentage. */
function markerPosition(value: number, [good, poor]: readonly [number, number]): number {
  const position =
    value <= good ? (value / good) * 50 : value <= poor ? 50 + ((value - good) / (poor - good)) * 30 : 80 + Math.min(1, (value - poor) / poor) * 20;
  return Math.min(98, Math.max(2, position));
}

function VitalMeter({ vital, spec }: { vital: Vital | null; spec: (typeof VITALS)[number] }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold text-ink">{spec.name}</span>
        {vital ? (
          <span className={cn("inline-flex h-[22px] items-center rounded-full px-2 text-xs font-semibold", CATEGORY_STYLE[vital.category].className)}>
            {CATEGORY_STYLE[vital.category].label}
          </span>
        ) : null}
      </div>
      <span className="text-[22px] font-semibold text-ink tabular-nums">{vital ? formatVital(spec.key, vital.value) : "—"}</span>
      <div aria-hidden className="relative flex h-1.5 gap-0.5">
        <span className="flex-[5] rounded-l-[3px] bg-[#86EFAC]" />
        <span className="flex-[3] bg-[#FCD34D]" />
        <span className="flex-[2] rounded-r-[3px] bg-[#FCA5A5]" />
        {vital ? (
          <span
            className="absolute -top-1 h-3.5 w-[3px] -translate-x-1/2 rounded-sm bg-ink"
            style={{ left: `${markerPosition(vital.value, spec.bounds)}%` }}
          />
        ) : null}
      </div>
      <span className="text-xs text-ink-quiet">
        {vital ? `${spec.meaning} · ${spec.good}` : spec.key === "inp" ? "Needs real-visitor data from Google" : spec.good}
      </span>
    </div>
  );
}

function CoreWebVitals({ speed }: { speed: SiteHealthData["speed"] }) {
  const result = speed.latest?.result;
  const field = result?.field ?? null;
  const vitals = field
    ? { lcp: field.lcp, inp: field.inp, cls: field.cls }
    : result
      ? { lcp: result.lab.lcp, inp: null, cls: result.lab.cls }
      : null;
  const measured = vitals ? Object.values(vitals).filter((vital): vital is Vital => vital !== null) : [];
  const verdict = measured.length > 0 ? (measured.every((vital) => vital.category === "good") ? "Passed" : "Not passed") : null;
  const description = !result
    ? "How fast and stable pages feel to real visitors on mobile"
    : field
      ? `How fast and stable ${field.scope === "origin" ? "the site feels" : "the home page feels"} to real visitors on mobile, last 28 days${verdict ? ` · ${verdict}` : ""}`
      : "Lab test of the home page on mobile: Google has too few real-visitor visits to report on yet";

  return (
    <Panel title="Core Web Vitals" description={description}>
      {vitals ? (
        <>
          <RunStatus error={speed.error} running={speed.running} />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {VITALS.map((spec) => (
              <VitalMeter key={spec.key} spec={spec} vital={vitals[spec.key]} />
            ))}
          </div>
        </>
      ) : (
        <CheckNotice
          error={speed.error}
          running={speed.running}
          empty={
            speed.configured
              ? "No speed test yet. It runs every day; an admin can also run it now."
              : "Not connected yet: the speed test needs a PageSpeed Insights API key (PAGESPEED_API_KEY)."
          }
        />
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------- Indexing

const BUCKETS: { key: IndexBucket; label: string; color: string }[] = [
  { key: "indexed", label: "Indexed", color: "#16A34A" },
  { key: "crawled-not-indexed", label: "Crawled, not indexed yet", color: "#F59E0B" },
  { key: "discovered-not-indexed", label: "Found, not crawled yet", color: "#FCD34D" },
  { key: "excluded", label: "Not indexed for another reason (redirect, noindex, duplicate, error)", color: "#C4C9D1" },
  { key: "unknown", label: "Not known to Google", color: "#E5E7EB" },
];

function Indexing({ indexing }: { indexing: SiteHealthData["indexing"] }) {
  const result = indexing.latest?.result;
  const rows = result ? BUCKETS.filter((bucket) => result.counts[bucket.key] > 0) : [];
  return (
    <Panel
      title="Indexing"
      description={
        result
          ? `Whether Google has added the site's pages to search · ${plural(result.total, "page")} in the sitemap`
          : "Whether Google has added the site's pages to search"
      }
    >
      {result ? (
        <div className="flex flex-col gap-3.5">
          <RunStatus error={indexing.error} running={indexing.running} />
          <div
            role="img"
            aria-label={rows.map((bucket) => `${result.counts[bucket.key]} ${bucket.label.toLowerCase()}`).join(", ")}
            className="flex h-3 gap-0.5 overflow-hidden rounded-md"
          >
            {rows.map((bucket) => (
              <span key={bucket.key} style={{ flex: result.counts[bucket.key], backgroundColor: bucket.color }} />
            ))}
          </div>
          <ul className="flex flex-col gap-2.5">
            {rows.map((bucket) => (
              <li key={bucket.key} className="flex items-center gap-2.5 text-[13px]">
                <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: bucket.color }} />
                <span className="flex-1 text-ink-body">{bucket.label}</span>
                <span className="font-semibold text-ink tabular-nums">{formatNumber(result.counts[bucket.key])}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <CheckNotice error={indexing.error} running={indexing.running} empty="No indexing check yet. It runs every day; an admin can also run it now." />
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------- Issues to fix

const PRIORITY_STYLE: Record<IssuePriority, { label: string; className: string }> = {
  high: { label: "High", className: "bg-[#FEE2E2] text-[#B91C1C]" },
  medium: { label: "Medium", className: "bg-[#FEF3C7] text-[#92400E]" },
  low: { label: "Low", className: "bg-tone-neutral-bg text-ink-body" },
};
const PRIORITY_RANK: Record<IssuePriority, number> = { high: 0, medium: 1, low: 2 };

/** Rows shown when an issue is expanded; the rest are counted. */
const SHOWN_PAGES = 50;

interface IssueRow {
  key: string;
  group: TrimmedIssueGroup;
  status: "new" | "open" | "fixed";
  fixedAt?: string;
}

function affects(group: TrimmedIssueGroup): string {
  return group.type === "broken-link" ? plural(group.total, "link") : plural(group.total, "page");
}

function StatusCell({ row }: { row: IssueRow }) {
  if (row.status === "fixed") {
    return (
      <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-tone-good-bg px-2.5 text-xs font-semibold text-tone-good-fg">
        <span aria-hidden className="size-1.5 rounded-full bg-status-good" />
        Fixed {row.fixedAt ? formatDate(row.fixedAt) : ""}
      </span>
    );
  }
  return row.status === "new" ? (
    <span className="text-[13px] font-medium text-ink-body">New</span>
  ) : (
    <span className="text-[13px] text-ink-quiet">Still open</span>
  );
}

function IssueDetails({ group }: { group: TrimmedIssueGroup }) {
  const shown = group.pages.slice(0, SHOWN_PAGES);
  return (
    <div className="mb-3.5 ml-10 overflow-hidden rounded-lg border border-border sm:mr-5">
      <table className="w-full table-fixed text-[13px]">
        <thead>
          <tr className="h-8 bg-[#FAFBFC] text-left text-xs font-medium text-ink-quiet">
            <th scope="col" className="px-3.5 font-medium">
              Page
            </th>
            {group.detailLabel ? (
              <th scope="col" className="px-3.5 font-medium">
                {group.detailLabel}
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {shown.map((page, index) => (
            <tr key={`${page.url}|${page.detail ?? ""}|${index}`} className="h-9 border-t border-line-soft">
              <td className="truncate px-3.5">
                {isWebUrl(page.url) ? (
                  <a href={page.url} target="_blank" rel="noopener noreferrer" title={page.url} className="text-primary hover:underline">
                    {shortenMiddle(displayPath(page.url))}
                  </a>
                ) : (
                  <span title={page.url}>{shortenMiddle(page.url)}</span>
                )}
              </td>
              {group.detailLabel ? (
                <td className="truncate px-3.5 text-ink-body" title={page.detail ?? undefined}>
                  {page.detail && isWebUrl(page.detail) ? shortenMiddle(displayPath(page.detail, page.url)) : (page.detail ?? "—")}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
      {group.total > shown.length ? (
        <p className="border-t border-line-soft px-3.5 py-2 text-xs text-ink-quiet">
          And {formatNumber(group.total - shown.length)} more
        </p>
      ) : null}
    </div>
  );
}

function IssuesTable({ rows }: { rows: IssueRow[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left">
        <caption className="sr-only">Issues to fix</caption>
        <thead>
          <tr className="h-10 border-y border-border bg-[#FAFBFC] text-xs font-medium text-ink-quiet">
            <th scope="col" className="w-10">
              <span className="sr-only">Show pages</span>
            </th>
            <th scope="col" className="font-medium">
              Issue
            </th>
            <th scope="col" className="w-[120px] font-medium">
              Affects
            </th>
            <th scope="col" className="w-[110px] font-medium">
              Priority
            </th>
            <th scope="col" className="w-[170px] pr-5 font-medium">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const expandable = row.status !== "fixed" && row.group.pages.length > 0;
            const expanded = expandable && Boolean(open[row.key]);
            const toggle = () => setOpen((current) => ({ ...current, [row.key]: !current[row.key] }));
            const detailsId = `issue-${row.key}`;
            return (
              <Fragment key={row.key}>
                <tr
                  onClick={expandable ? toggle : undefined}
                  className={cn("border-t border-line-soft", expandable && "cursor-pointer hover:bg-[#FAFBFC]")}
                >
                  <td className="pl-3 align-middle">
                    {expandable ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggle();
                        }}
                        aria-expanded={expanded}
                        aria-controls={expanded ? detailsId : undefined}
                        className="flex size-7 items-center justify-center rounded-md text-ink-quiet outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <ChevronRight className={cn("size-4 transition-transform", expanded && "rotate-90")} aria-hidden />
                        <span className="sr-only">
                          {expanded ? "Hide" : "Show"} pages for {row.group.title}
                        </span>
                      </button>
                    ) : null}
                  </td>
                  <td className="py-2.5 pr-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className={cn("text-sm font-medium", row.status === "fixed" ? "text-ink-quiet" : "text-ink")}>{row.group.title}</span>
                      <span className="text-xs text-ink-quiet">{row.group.description}</span>
                    </div>
                  </td>
                  <td className="text-[13px] text-ink-body tabular-nums">{affects(row.group)}</td>
                  <td>
                    <span className={cn("inline-flex h-[22px] items-center rounded-md px-2 text-xs font-semibold", PRIORITY_STYLE[row.group.priority].className)}>
                      {PRIORITY_STYLE[row.group.priority].label}
                    </span>
                  </td>
                  <td className="pr-5">
                    <StatusCell row={row} />
                  </td>
                </tr>
                {expanded ? (
                  <tr id={detailsId}>
                    <td colSpan={5}>
                      <IssueDetails group={row.group} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Pages Google has seen but not indexed, as one more issue alongside the site check's. */
function notIndexedGroup(indexing: SiteHealthData["indexing"]): TrimmedIssueGroup | null {
  const result = indexing.latest?.result;
  if (!result || result.notIndexedTotal === 0) return null;
  const pages = result.notIndexed;
  return {
    type: "not-indexed",
    total: result.notIndexedTotal,
    priority: "high",
    title: "Pages not indexed yet",
    description: "Google knows about them but has not added them to search results",
    detailLabel: "Last crawled",
    pages: pages.map((page) => ({
      url: page.url,
      detail: page.lastCrawlTime ? formatDate(page.lastCrawlTime) : "Not crawled yet",
    })),
  };
}

function issueRows(data: SiteHealthData): IssueRow[] {
  const latest = data.crawl.latest?.result.issues ?? [];
  const extra = notIndexedGroup(data.indexing);
  const groups = [...latest, ...(extra ? [extra] : [])].sort(
    (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.total - a.total || a.title.localeCompare(b.title),
  );
  const newTypes = new Set(data.crawl.newTypes);
  return [
    ...groups.map((group) => ({ key: group.type, group, status: newTypes.has(group.type) ? ("new" as const) : ("open" as const) })),
    ...data.crawl.fixedGroups.map((group) => ({
      key: `fixed-${group.type}`,
      group,
      status: "fixed" as const,
      fixedAt: data.crawl.latest?.finishedAt,
    })),
  ];
}

// ---------------------------------------------------------------- Page

export function SiteHealthView({ data, actions }: { data: SiteHealthData; actions?: ReactNode }) {
  const { speed, indexing, crawl } = data;
  const index = indexing.latest?.result;
  const notIndexed = index ? index.total - index.counts.indexed : 0;
  const rows = issueRows(data);
  const openRows = rows.filter((row) => row.status !== "fixed");
  const highPriority = openRows.filter((row) => row.group.priority === "high").length;
  const score = speed.latest?.result.score ?? null;
  const change = score !== null && speed.baseline ? score - speed.baseline.score : null;
  const hasIssueData = Boolean(crawl.latest) || Boolean(index);

  return (
    <>
      <MetricGrid>
        <MetricCard
          tone="green"
          label="Pages indexed by Google"
          value={index ? formatNumber(index.counts.indexed) : "—"}
          suffix={index ? `/${formatNumber(index.total)}` : undefined}
          detail={index ? (notIndexed > 0 ? `${plural(notIndexed, "page")} not indexed` : "Every sitemap page is indexed") : "Waiting for the first indexing check"}
        />
        <MetricCard
          tone="amber"
          label="Open issues"
          value={hasIssueData ? formatNumber(openRows.length) : "—"}
          detail={hasIssueData ? `${formatNumber(highPriority)} high priority` : "Waiting for the first site check"}
        />
        <MetricCard
          tone="blue"
          label="Technical fixes"
          value={crawl.fixed ? formatNumber(crawl.fixed.count) : "—"}
          detail={crawl.fixed ? `Since the check on ${formatDate(crawl.fixed.since)}` : "Counted from the second weekly check"}
        />
        <MetricCard
          tone="neutral"
          label="Mobile speed score"
          value={score !== null ? formatNumber(score) : "—"}
          suffix={score !== null ? "/100" : undefined}
          delta={
            change !== null && speed.baseline
              ? { text: change === 0 ? "No change" : `${change > 0 ? "+" : "−"}${Math.abs(change)}`, direction: change > 0 ? "up" : change < 0 ? "down" : "flat" }
              : undefined
          }
          detail={
            change !== null && speed.baseline
              ? `since ${formatDate(speed.baseline.at)}`
              : speed.latest
                ? `Home page, tested ${formatDate(speed.latest.finishedAt)}`
                : speed.configured
                  ? "Waiting for the first speed test"
                  : "Speed test not connected yet"
          }
        />
      </MetricGrid>

      <div className="grid grid-cols-1 items-start gap-4 min-[1100px]:grid-cols-2">
        <CoreWebVitals speed={speed} />
        <Indexing indexing={indexing} />
      </div>

      <Panel
        flush
        title="Issues to fix"
        description={
          crawl.latest
            ? `From the weekly site check of ${plural(crawl.latest.result.pagesChecked, "page")}, most important first · Latest check ${formatDate(crawl.latest.finishedAt)}`
            : "From the weekly site check, most important first"
        }
        actions={actions}
      >
        {rows.length > 0 ? (
          <>
            <div className="px-5 pt-3">
              <RunStatus error={crawl.error} running={crawl.running} />
            </div>
            <p className="px-5 pb-2 text-xs text-ink-quiet">Select an issue to see the pages it affects.</p>
            <IssuesTable rows={rows} />
          </>
        ) : crawl.latest ? (
          <div className="px-5 py-4">
            <Quiet>No issues found in the latest check.</Quiet>
          </div>
        ) : (
          <div className="px-5 py-4">
            <CheckNotice error={crawl.error} running={crawl.running} empty="No site check yet. It runs every Monday; an admin can also run it now." />
          </div>
        )}
      </Panel>
    </>
  );
}
