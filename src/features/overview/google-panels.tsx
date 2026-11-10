import { Info } from "lucide-react";
import type { GoogleOverview, GoogleSource, SearchTotals, TrafficTotals } from "@/lib/data/google";
import { percentChange } from "@/lib/domain/change";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tone = "good" | "bad" | "flat";

interface Stat {
  label: string;
  value: string;
  change: { text: string; tone: Tone } | null;
}

const TONE_CLASS: Record<Tone, string> = {
  good: "text-status-good",
  bad: "text-status-critical",
  flat: "text-muted-foreground",
};

/** Higher is better: clicks, sessions, and so on. */
function countChange(current: number, previous: number): Stat["change"] {
  const change = percentChange(current, previous);
  if (change === null) return current === 0 ? null : { text: "New this period", tone: "flat" };
  if (change === 0) return { text: "No change", tone: "flat" };
  return { text: `${change > 0 ? "+" : ""}${change}%`, tone: change > 0 ? "good" : "bad" };
}

/** CTR in percentage points. */
function pointsChange(current: number | null, previous: number | null): Stat["change"] {
  if (current === null || previous === null) return null;
  const delta = Math.round((current - previous) * 10) / 10;
  if (delta === 0) return { text: "No change", tone: "flat" };
  return { text: `${delta > 0 ? "+" : ""}${delta.toFixed(1)} pts`, tone: delta > 0 ? "good" : "bad" };
}

/** Average position: a lower number is a better ranking. */
function positionChange(current: number | null, previous: number | null): Stat["change"] {
  if (current === null || previous === null) return null;
  const delta = Math.round((previous - current) * 10) / 10;
  if (delta === 0) return { text: "No change", tone: "flat" };
  return { text: `${delta > 0 ? "Improved" : "Dropped"} ${Math.abs(delta).toFixed(1)}`, tone: delta > 0 ? "good" : "bad" };
}

function searchStats({ current, previous }: { current: SearchTotals; previous: SearchTotals }): Stat[] {
  return [
    { label: "Clicks", value: formatNumber(current.clicks), change: countChange(current.clicks, previous.clicks) },
    {
      label: "Impressions",
      value: formatNumber(current.impressions),
      change: countChange(current.impressions, previous.impressions),
    },
    {
      label: "Click-through rate",
      value: current.ctr === null ? "—" : formatPercent(current.ctr, 1),
      change: pointsChange(current.ctr, previous.ctr),
    },
    {
      label: "Average position",
      value: current.position === null ? "—" : current.position.toFixed(1),
      change: positionChange(current.position, previous.position),
    },
  ];
}

function trafficStats({ current, previous }: { current: TrafficTotals; previous: TrafficTotals }): Stat[] {
  return [
    { label: "Sessions", value: formatNumber(current.sessions), change: countChange(current.sessions, previous.sessions) },
    { label: "Users", value: formatNumber(current.users), change: countChange(current.users, previous.users) },
    {
      label: "Organic sessions",
      value: formatNumber(current.organicSessions),
      change: countChange(current.organicSessions, previous.organicSessions),
    },
    {
      label: "Organic users",
      value: formatNumber(current.organicUsers),
      change: countChange(current.organicUsers, previous.organicUsers),
    },
  ];
}

function Panel<T>({
  title,
  caption,
  source,
  toStats,
  compareText,
}: {
  title: string;
  caption: string;
  source: GoogleSource<T>;
  toStats: (data: { current: T; previous: T }) => Stat[];
  compareText: string;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{caption}</p>
      </div>
      {source.status === "ok" ? (
        <>
          <dl className="grid grid-cols-2 gap-3">
            {toStats(source.data).map((stat) => (
              <div key={stat.label} className="flex min-w-0 flex-col gap-0.5">
                <dt className="truncate text-xs text-muted-foreground">{stat.label}</dt>
                <dd className="text-xl font-semibold tracking-tight tabular-nums">{stat.value}</dd>
                <dd className={cn("text-xs tabular-nums", stat.change ? TONE_CLASS[stat.change.tone] : "text-muted-foreground")}>
                  {stat.change ? stat.change.text : "—"}
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-muted-foreground">{compareText}</p>
        </>
      ) : (
        <div className="flex items-start gap-2 text-sm">
          <Info
            className={cn(
              "mt-0.5 size-4 shrink-0",
              source.status === "error" ? "text-status-warning" : "text-muted-foreground",
            )}
            aria-hidden
          />
          <p className="text-muted-foreground">
            {source.status === "not-connected" ? (
              <>
                <span className="font-medium text-foreground">Not connected yet.</span> {source.message}
              </>
            ) : source.status === "error" ? (
              <>
                <span className="font-medium text-foreground">Could not load this data.</span> {source.message}
              </>
            ) : (
              source.message
            )}
          </p>
        </div>
      )}
    </section>
  );
}

/** Search Console and GA4 totals for the selected period, compared with the period before it. */
export function GooglePanels({ google }: { google: GoogleOverview }) {
  const { window } = google;
  const compareText = window
    ? `Changes compare with the previous ${formatNumber(window.days)} ${window.days === 1 ? "day" : "days"} (${formatDate(window.previous.from)} – ${formatDate(window.previous.to)}).`
    : "";
  const through = window ? `Through ${formatDate(window.current.to)}` : "";
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel
        title="Google Search performance"
        caption={through ? `Search Console · ${through}` : "Search Console"}
        source={google.search}
        toStats={searchStats}
        compareText={compareText}
      />
      <Panel
        title="Website traffic"
        caption={through ? `Google Analytics 4 · ${through}` : "Google Analytics 4"}
        source={google.traffic}
        toStats={trafficStats}
        compareText={compareText}
      />
    </div>
  );
}
