import type { ReactNode } from "react";
import { Panel } from "@/components/data/panel";
import { ExternalLink } from "@/components/data/external-link";
import { SourceNotice } from "@/components/data/source-notice";
import { percentChange } from "@/lib/domain/change";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MonthlyReportData } from "@/lib/data/reports";
import type { ReportSection } from "@/server/reports/assemble";
import { eventLabel } from "@/features/traffic/trend";

/* Building blocks ------------------------------------------------------- */

type Tone = "good" | "bad" | "flat";
const TONE: Record<Tone, string> = { good: "text-tone-good-fg", bad: "text-tone-critical-fg", flat: "text-ink-quiet" };

interface Change {
  text: string;
  tone: Tone;
}

/** Higher is better. */
function countChange(current: number, previous: number): Change | null {
  const change = percentChange(current, previous);
  if (change === null) return current === 0 ? null : { text: "New this month", tone: "flat" };
  if (change === 0) return { text: "No change", tone: "flat" };
  return { text: `${change > 0 ? "+" : ""}${change}% vs last month`, tone: change > 0 ? "good" : "bad" };
}

function pointsChange(current: number | null, previous: number | null): Change | null {
  if (current === null || previous === null) return null;
  const delta = Math.round((current - previous) * 10) / 10;
  if (delta === 0) return { text: "No change", tone: "flat" };
  return { text: `${delta > 0 ? "+" : ""}${delta.toFixed(1)} pts vs last month`, tone: delta > 0 ? "good" : "bad" };
}

/** Lower is better. */
function positionChange(current: number | null, previous: number | null): Change | null {
  if (current === null || previous === null) return null;
  const delta = Math.round((previous - current) * 10) / 10;
  if (delta === 0) return { text: "No change", tone: "flat" };
  return { text: `${delta > 0 ? "Improved" : "Dropped"} ${Math.abs(delta).toFixed(1)}`, tone: delta > 0 ? "good" : "bad" };
}

function Stats({ items }: { items: { label: string; value: string; change: Change | null }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-col gap-1 rounded-xl border border-line px-4 py-3.5">
          <dt className="truncate text-[13px] font-medium text-ink-quiet">{item.label}</dt>
          <dd className="text-[26px] leading-[30px] font-semibold tracking-[-0.02em] text-ink tabular-nums">{item.value}</dd>
          <dd className={cn("text-xs font-medium", item.change ? TONE[item.change.tone] : "text-ink-quiet")}>{item.change?.text ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function MiniTable({ title, columns, rows }: { title: string; columns: string[]; rows: ReactNode[][] }) {
  if (rows.length === 0) return null;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <div className="scroll-thin overflow-x-auto">
      <table className="w-full text-[13px] text-ink-body">
        <thead>
          <tr className="border-b border-line bg-surface-subtle text-xs text-ink-quiet">
            {columns.map((column, i) => (
              <th key={column} scope="col" className={cn("px-2 py-2 font-medium", i === 0 ? "text-left" : "text-right")}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, r) => (
            <tr key={r} className="border-b border-line-soft last:border-0">
              {cells.map((cell, i) => (
                <td key={i} className={cn("px-2 py-2 align-top", i === 0 ? "min-w-40 break-words" : "text-right whitespace-nowrap tabular-nums")}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function Section<T>({
  title,
  source,
  section,
  children,
}: {
  title: string;
  source: string;
  section: ReportSection<T>;
  children: (data: T) => ReactNode;
}) {
  return (
    <Panel title={title} description={source} className="break-inside-avoid-page print:border-line" bodyClassName="flex flex-col gap-5">
      {section.status === "ok" ? children(section.data) : <SourceNotice source={section} />}
    </Panel>
  );
}

function Placeholder({ title, message }: { title: string; message: string }) {
  return (
    <Panel title={title} className="border-dashed print:hidden">
      <SourceNotice source={{ status: "not-connected", message }} />
    </Panel>
  );
}

const pathOf = (url: string) => {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
};
const signed = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(1)}`;

/* Sections ---------------------------------------------------------------- */

export function ReportSections({ data }: { data: MonthlyReportData }) {
  return (
    <div className="flex flex-col gap-6 print:gap-8">
      <Section title="Search performance" source="Google Search Console" section={data.search}>
        {({ totals: { current, previous }, topQueries, topPages, improved, declined }) => (
          <>
            <Stats
              items={[
                { label: "Organic clicks", value: formatNumber(current.clicks), change: countChange(current.clicks, previous.clicks) },
                { label: "Impressions", value: formatNumber(current.impressions), change: countChange(current.impressions, previous.impressions) },
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
              ]}
            />
            <div className="grid gap-5 lg:grid-cols-2 print:grid-cols-2">
              <MiniTable
                title="Top keywords"
                columns={["Keyword", "Clicks", "Position"]}
                rows={topQueries.map((row) => [row.query, formatNumber(row.clicks), row.position?.toFixed(1) ?? "—"])}
              />
              <MiniTable
                title="Top pages"
                columns={["Page", "Clicks", "Impressions"]}
                rows={topPages.map((row) => [
                  <ExternalLink key="l" href={row.url} className="break-all">
                    {pathOf(row.url)}
                  </ExternalLink>,
                  formatNumber(row.clicks),
                  formatNumber(row.impressions),
                ])}
              />
              <MiniTable
                title="Biggest ranking gains"
                columns={["Keyword", "Position", "Change"]}
                rows={improved.map((row) => [row.query, row.position?.toFixed(1) ?? "—", <span key="c" className="text-tone-good-fg">{signed(row.positionChange!)}</span>])}
              />
              <MiniTable
                title="Biggest ranking drops"
                columns={["Keyword", "Position", "Change"]}
                rows={declined.map((row) => [row.query, row.position?.toFixed(1) ?? "—", <span key="c" className="text-tone-critical-fg">{signed(row.positionChange!)}</span>])}
              />
            </div>
          </>
        )}
      </Section>

      <Section title="Website traffic" source="Google Analytics 4" section={data.traffic}>
        {({ totals: { current, previous }, channels }) => (
          <>
            <Stats
              items={[
                { label: "Sessions", value: formatNumber(current.sessions), change: countChange(current.sessions, previous.sessions) },
                { label: "Users", value: formatNumber(current.users), change: countChange(current.users, previous.users) },
                { label: "Organic sessions", value: formatNumber(current.organicSessions), change: countChange(current.organicSessions, previous.organicSessions) },
                { label: "Organic users", value: formatNumber(current.organicUsers), change: countChange(current.organicUsers, previous.organicUsers) },
              ]}
            />
            <MiniTable
              title="Sessions by channel"
              columns={["Channel", "Sessions", "Last month", "Change"]}
              rows={channels
                .filter((row) => row.sessions > 0 || row.previousSessions > 0)
                .map((row) => {
                  const change = percentChange(row.sessions, row.previousSessions);
                  return [row.channel, formatNumber(row.sessions), formatNumber(row.previousSessions), change === null ? "—" : `${change > 0 ? "+" : ""}${change}%`];
                })}
            />
          </>
        )}
      </Section>

      <Section title="Enquiries" source="GA4 key events" section={data.conversions}>
        {({ current, previous, byEvent, topPages }) => (
          <>
            <Stats
              items={byEvent.length > 0
                ? [
                    { label: "All enquiries", value: formatNumber(current), change: countChange(current, previous) },
                    ...byEvent.slice(0, 3).map((row) => ({ label: eventLabel(row.event), value: formatNumber(row.count), change: null })),
                  ]
                : [{ label: "All enquiries", value: formatNumber(current), change: countChange(current, previous) }]}
            />
            <MiniTable
              title="Pages enquiring visitors arrived on"
              columns={["Landing page", "Enquiries", "Visits", "Rate"]}
              rows={topPages.map((row) => [
                <span key="p" className="break-all">{row.path}</span>,
                formatNumber(row.keyEvents),
                formatNumber(row.sessions),
                row.conversionRate === null ? "—" : formatPercent(row.conversionRate, 1),
              ])}
            />
          </>
        )}
      </Section>

      <Section title="Leads" source="Lead Inbox (website forms and imported sheet)" section={data.leads}>
        {({ current, previous, bySource }) => (
          <>
            <Stats
              items={[
                { label: "Leads (excl. spam)", value: formatNumber(current.genuine), change: countChange(current.genuine, previous.genuine) },
                { label: "From organic search", value: formatNumber(current.organic), change: countChange(current.organic, previous.organic) },
                { label: "Spam filtered", value: formatNumber(current.spam), change: null },
                { label: "Won", value: formatNumber(current.won), change: countChange(current.won, previous.won) },
              ]}
            />
            <MiniTable
              title="Leads by source"
              columns={["Source", "Leads"]}
              rows={bySource.map((row) => [row.source, formatNumber(row.count)])}
            />
          </>
        )}
      </Section>

      <Section title="Work completed" source="Teamwork" section={data.work}>
        {({ completed, previousCompleted, open, completedTasks }) => (
          <>
            <Stats
              items={[
                { label: "Tasks completed", value: formatNumber(completed), change: countChange(completed, previousCompleted) },
                { label: "Still open", value: formatNumber(open), change: null },
              ]}
            />
            <MiniTable
              title={completed > completedTasks.length ? `Latest ${completedTasks.length} of ${completed} completed tasks` : "Completed tasks"}
              columns={["Task", "Completed"]}
              rows={completedTasks.map((task) => [
                <span key="t">
                  <ExternalLink href={task.url ?? undefined}>{task.name}</ExternalLink>
                  <span className="block text-xs text-ink-quiet">{task.category}</span>
                </span>,
                formatDate(task.completedDate),
              ])}
            />
            <p className="text-xs text-ink-quiet">&ldquo;Still open&rdquo; counts tasks due by the end of the month that are not done today.</p>
          </>
        )}
      </Section>

      <Section title="Strategy progress" source="SEO strategy sheet" section={data.strategy}>
        {({ items, averageAchievement, averageWork }) => (
          <>
            <Stats
              items={[
                { label: "Goal achieved (average)", value: averageAchievement === null ? "—" : `${averageAchievement}%`, change: null },
                { label: "Work done (average)", value: averageWork === null ? "—" : `${averageWork}%`, change: null },
              ]}
            />
            <MiniTable
              title="Strategies"
              columns={["Strategy", "Goal", "Current", "Achieved", "Work"]}
              rows={items.map((item) => [
                <span key="s">
                  {item.initiative}
                  <span className="block text-xs text-ink-quiet">
                    {item.goalType} · {item.status}
                  </span>
                </span>,
                item.kpiTarget ?? "—",
                item.kpiCurrent ?? "—",
                item.achieved === null ? "—" : `${item.achieved}%`,
                item.workProgress === null ? "—" : `${item.workProgress}%`,
              ])}
            />
            <p className="text-xs text-ink-quiet">
              Goal and current values are as recorded in the strategy sheet when this report was generated.
            </p>
          </>
        )}
      </Section>

      <Placeholder title="Revenue" message="QuickBooks is being connected. Paid invoices for the month will appear here." />
      <Placeholder title="Site health" message="Broken links and site issues will appear here once monitoring is set up." />
    </div>
  );
}
