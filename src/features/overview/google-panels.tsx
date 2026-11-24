import { PeriodLink } from "@/components/layout/period-link";
import { DeltaIndicator, type MetricDelta } from "@/components/data/metric-card";
import { Panel, PanelBlock, PanelColumns } from "@/components/data/panel";
import { SourceNotice } from "@/components/data/source-notice";
import type { GoogleOverview, GoogleSource, SearchTotals, TrafficTotals } from "@/lib/data/google";
import { percentChange } from "@/lib/domain/change";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";

interface Stat {
  label: string;
  value: string;
  change: MetricDelta | null;
}

/** Higher is better: clicks, sessions, and so on. */
function countChange(current: number, previous: number): Stat["change"] {
  const change = percentChange(current, previous);
  if (change === null) return current === 0 ? null : { text: "New this period", direction: "flat" };
  if (change === 0) return { text: "No change", direction: "flat" };
  return { text: `${Math.abs(change)}%`, direction: change > 0 ? "up" : "down" };
}

/** CTR in percentage points. */
function pointsChange(current: number | null, previous: number | null): Stat["change"] {
  if (current === null || previous === null) return null;
  const delta = Math.round((current - previous) * 10) / 10;
  if (delta === 0) return { text: "No change", direction: "flat" };
  return { text: `${Math.abs(delta).toFixed(1)} pts`, direction: delta > 0 ? "up" : "down" };
}

/** Average position: a lower number is a better ranking, so a drop in the figure is good. */
function positionChange(current: number | null, previous: number | null): Stat["change"] {
  if (current === null || previous === null) return null;
  const delta = Math.round((previous - current) * 10) / 10;
  if (delta === 0) return { text: "No change", direction: "flat" };
  return {
    text: `${delta > 0 ? "Improved" : "Dropped"} ${Math.abs(delta).toFixed(1)}`,
    direction: delta > 0 ? "up" : "down",
    good: delta > 0,
  };
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

function SourceBlock<T>({
  title,
  caption,
  source,
  toStats,
}: {
  title: string;
  caption: string;
  source: GoogleSource<T>;
  toStats: (data: { current: T; previous: T }) => Stat[];
}) {
  return (
    <PanelBlock headingLevel={4} title={title} description={caption}>
      {source.status === "ok" ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
          {toStats(source.data).map((stat) => (
            <div key={stat.label} className="flex min-w-0 flex-col gap-1">
              <dt className="truncate text-[13px] font-medium text-ink-quiet">{stat.label}</dt>
              <dd className="text-[22px] leading-7 font-semibold tracking-[-0.02em] text-ink tabular-nums">{stat.value}</dd>
              <dd className="text-xs leading-[18px] text-ink-quiet">
                {stat.change ? <DeltaIndicator delta={stat.change} /> : "—"}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <SourceNotice source={source} />
      )}
    </PanelBlock>
  );
}

/** Search Console and GA4 totals for the selected period, compared with the period before it. */
export function GooglePanels({ google }: { google: GoogleOverview }) {
  const { window } = google;
  const compareText = window
    ? `Changes compare with the previous ${formatNumber(window.days)} ${window.days === 1 ? "day" : "days"} (${formatDate(window.previous.from)} – ${formatDate(window.previous.to)}).`
    : "";
  const through = window ? `Through ${formatDate(window.current.to)}` : "";
  const anyData = google.search.status === "ok" || google.traffic.status === "ok";
  return (
    <Panel
      title="Search and website traffic"
      description={through ? `Google Search Console and Analytics · ${through}` : "Google Search Console and Analytics"}
      headingLevel={3}
      actions={
        <PeriodLink
          href="/traffic-seo"
          className="inline-flex h-[30px] items-center rounded-lg px-2.5 text-[13px] font-medium text-primary hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          View details
          <span className="sr-only"> about search and traffic</span>
        </PeriodLink>
      }
    >
      <div className="flex flex-col gap-5">
        <PanelColumns>
          <SourceBlock
            title="Google Search performance"
            caption="Search Console"
            source={google.search}
            toStats={searchStats}
          />
          <SourceBlock
            title="Website traffic"
            caption="Google Analytics 4"
            source={google.traffic}
            toStats={trafficStats}
          />
        </PanelColumns>
        {anyData && compareText ? <p className="text-xs text-ink-quiet">{compareText}</p> : null}
      </div>
    </Panel>
  );
}
