"use client";

import { PeriodLink } from "@/components/layout/period-link";
import type { ReactNode } from "react";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { EmptyState } from "@/components/data/empty-state";
import { Panel } from "@/components/data/panel";
import { StatusBadge } from "@/components/data/status-badge";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { STAGE_META } from "@/lib/domain/leads";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Lead, PipelineColumn } from "@/lib/types";
import { SourceIcon } from "./lead-ui";
import { useLeads } from "./leads-store";

export function Fields({ items }: { items: readonly { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid gap-x-5 gap-y-3.5 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-xs text-ink-quiet">{item.label}</dt>
          <dd className="text-sm [overflow-wrap:anywhere] text-ink">{item.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The design's back button: a quiet chevron link above the page content. */
function BackLink() {
  return (
    <PeriodLink
      href="/leads"
      className="-ml-1.5 inline-flex h-8 w-fit items-center gap-1 rounded-lg pr-2.5 pl-1.5 text-[13px] font-medium text-ink-body outline-none hover:bg-[#F1F3F5] focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ChevronLeft className="size-4" aria-hidden />
      All leads
    </PeriodLink>
  );
}

/** A Teamwork board column as a pill, in the column's own colour. */
export function ColumnPill({ column }: { column: PipelineColumn }) {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-tone-neutral-bg px-2.5 text-xs font-semibold whitespace-nowrap text-ink-body">
      <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: column.color }} />
      {column.name}
    </span>
  );
}

function ExternalText({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
      {children}
    </a>
  );
}

/** A website as typed on the card, made into a link when it looks like one. */
export function websiteLink(website: string | null): ReactNode {
  if (!website) return null;
  const href = /^https?:\/\//i.test(website) ? website : /^[\w-]+(\.[\w-]+)+/.test(website) ? `https://${website}` : null;
  return href ? <ExternalText href={href}>{website}</ExternalText> : website;
}

export function emailLink(email: string | null): ReactNode {
  if (!email) return null;
  return /^[^\s@,]+@[^\s@,]+$/.test(email) ? <a href={`mailto:${email}`} className="text-primary hover:underline">{email}</a> : email;
}

/** A lead's activity, newest first, as a timeline. */
export function ActivityList({ activity }: { activity: Lead["activity"] }) {
  return (
    <ol className="flex flex-col">
      {[...activity]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((entry, index, all) => (
          <li key={entry.id} className="relative flex flex-col gap-px pb-3.5 pl-5 last:pb-0">
            <span aria-hidden className="absolute top-1.5 left-[3px] size-2 rounded-full bg-bar-muted" />
            {index < all.length - 1 ? <span aria-hidden className="absolute top-4 bottom-0 left-1.5 w-0.5 bg-line" /> : null}
            <p className="text-sm text-ink">{entry.description}</p>
            <p className="text-xs text-ink-quiet">
              {entry.actorName ?? "Teamwork"} · {formatDateTime(entry.createdAt)}
            </p>
          </li>
        ))}
    </ol>
  );
}

/**
 * One lead: a card on the Teamwork Pipeline board, read-only. Everything here
 * comes from the card; changes are made in Teamwork.
 */
export function LeadDetail({ leadId }: { leadId: string }) {
  const { getLead } = useLeads();
  const lead = getLead(leadId);

  if (!lead) {
    return (
      <PageBody>
        <EmptyState
          title="Lead not found"
          description="This card is no longer on the Teamwork Pipeline board, or it was completed there."
          action={
            <Button variant="outline" asChild>
              <PeriodLink href="/leads">Back to all leads</PeriodLink>
            </Button>
          }
        />
      </PageBody>
    );
  }

  const info = lead.teamwork;

  return (
    <PageBody>
      <PageHeader title={lead.name} description={lead.company || undefined} />
      <div className="flex flex-col gap-4">
        <BackLink />
        <div className="flex flex-wrap items-start justify-between gap-3">
          {/* The visible name repeats the screen-reader page heading above. */}
          <div aria-hidden className="flex min-w-0 flex-col gap-1.5">
            <p className="text-xl leading-tight font-semibold text-ink [overflow-wrap:anywhere]">{lead.name}</p>
            {lead.company && lead.company !== lead.name ? <p className="text-sm text-ink-quiet">{lead.company}</p> : null}
          </div>
          {info ? (
            <Button variant="outline" asChild>
              <a href={info.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden />
                Open in Teamwork
                <span className="sr-only"> (new tab)</span>
              </a>
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {info ? <ColumnPill column={info.column} /> : null}
          <StatusBadge tone={STAGE_META[lead.stage].tone} label={STAGE_META[lead.stage].label} />
        </div>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <Panel title="Contact information">
            <Fields
              items={[
                { label: "Lead", value: lead.name },
                { label: "Contact name", value: lead.company },
                { label: "Email", value: emailLink(lead.email) },
                { label: "Website", value: websiteLink(info?.website ?? null) },
              ]}
            />
          </Panel>
          <Panel title="Notes" description="From the Teamwork card">
            {lead.message ? (
              <p className="rounded-lg bg-[#F9FAFB] px-3.5 py-3 text-sm leading-[1.55] whitespace-pre-wrap text-ink">{lead.message}</p>
            ) : (
              <p className="text-sm text-ink-quiet">No notes on the card.</p>
            )}
          </Panel>
          <Panel title="Where they came from">
            <Fields
              items={[
                {
                  label: "Source",
                  value: (
                    <span className="flex items-center gap-2">
                      <SourceIcon source={lead.attribution.source} />
                      {lead.attribution.source}
                    </span>
                  ),
                },
                { label: "Tags", value: info?.tags.length ? info.tags.join(", ") : null },
                { label: "Source note", value: lead.attribution.heardFrom },
              ]}
            />
          </Panel>
        </div>
        <div className="flex flex-col gap-6">
          <Panel title="Status" description="Where the card sits on the Pipeline board">
            <Fields
              items={[
                { label: "Column", value: info ? <ColumnPill column={info.column} /> : null },
                { label: "Assigned to", value: info?.assignees.length ? info.assignees.join(", ") : "Unassigned" },
                { label: "Start date", value: info?.startDate ? formatDate(info.startDate) : null },
                { label: "Due date", value: info?.dueDate ? formatDate(info.dueDate) : null },
                { label: "Added", value: lead.submittedAt ? formatDateTime(lead.submittedAt) : null },
                { label: "Last updated in Teamwork", value: info?.updatedAt ? formatDateTime(info.updatedAt) : null },
              ]}
            />
          </Panel>
          <Panel title="Activity">
            {lead.activity.length === 0 ? (
              <p className="text-sm text-ink-quiet">No activity recorded yet.</p>
            ) : (
              <ActivityList activity={lead.activity} />
            )}
          </Panel>
        </div>
      </div>
    </PageBody>
  );
}
