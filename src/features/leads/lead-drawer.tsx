"use client";

import { useEffect, type MouseEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/data/status-badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { STAGE_META } from "@/lib/domain/leads";
import { formatDate, formatDateTime } from "@/lib/format";
import { ActivityList, ColumnPill, emailLink, Fields, websiteLink } from "./lead-detail";
import { SourceIcon } from "./lead-ui";
import { useLeads } from "./leads-store";

/**
 * Lead details open in a panel from the right, over the list or board, as in
 * the design. The open lead lives in the URL (`?lead=<id>`), so a panel can be
 * shared and Back closes it. The URL changes through the History API, which the
 * Next.js router follows without a server round trip.
 */
const PARAM = "lead";

/** Whether the panel was opened on this page, so closing it can step back instead of adding history. */
let openedHere = false;

export function openLead(id: string) {
  const params = new URLSearchParams(window.location.search);
  const alreadyOpen = params.has(PARAM);
  params.set(PARAM, id);
  const url = `${window.location.pathname}?${params}`;
  // Switching leads while the panel is open replaces the entry, so Back still closes it.
  if (alreadyOpen) window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
  if (!alreadyOpen) openedHere = true;
}

function closeLead() {
  if (openedHere) {
    openedHere = false;
    window.history.back();
    return;
  }
  // Opened from a shared link: drop the parameter without adding history.
  const params = new URLSearchParams(window.location.search);
  params.delete(PARAM);
  const query = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
}

/**
 * Click handler for a link to a lead's page: a plain click opens the panel; a
 * modified click (new tab, new window) still follows the link to the full page.
 */
export function openLeadOnClick(id: string) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openLead(id);
  };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-border px-6 py-5">
      <h3 className="text-xs font-semibold tracking-wide text-ink-quiet uppercase">{title}</h3>
      {children}
    </section>
  );
}

export function LeadDrawer() {
  const searchParams = useSearchParams();
  const { getLead } = useLeads();
  const id = searchParams.get(PARAM);
  const lead = id ? getLead(id) : undefined;
  const info = lead?.teamwork;

  // Closed some other way (Back, a link): the next close must not step back again.
  useEffect(() => {
    if (!id) openedHere = false;
  }, [id]);

  return (
    <Sheet open={Boolean(lead)} onOpenChange={(open) => (open ? null : closeLead())}>
      <SheetContent
        side="right"
        // Dim the list without blurring it, so it stays readable behind the panel.
        overlayClassName="bg-black/15 supports-backdrop-filter:backdrop-blur-none"
        className="gap-0 overflow-y-auto p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[520px]"
      >
        {lead ? (
          <>
            <header className="flex flex-col gap-2.5 px-6 pt-6 pb-5 pr-14">
              <div className="flex min-w-0 flex-col gap-1">
                <SheetTitle className="text-xl leading-tight font-semibold text-ink [overflow-wrap:anywhere]">{lead.name}</SheetTitle>
                <SheetDescription className="text-sm text-ink-quiet">
                  {lead.company && lead.company !== lead.name ? lead.company : "Lead from the Teamwork Pipeline board"}
                </SheetDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {info ? <ColumnPill column={info.column} /> : null}
                <StatusBadge tone={STAGE_META[lead.stage].tone} label={STAGE_META[lead.stage].label} />
              </div>
              {info ? (
                <Button variant="outline" size="sm" className="w-fit" asChild>
                  <a href={info.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink aria-hidden />
                    Open in Teamwork
                    <span className="sr-only"> (new tab)</span>
                  </a>
                </Button>
              ) : null}
            </header>

            <Section title="Contact">
              <Fields
                items={[
                  { label: "Contact name", value: lead.company },
                  { label: "Email", value: emailLink(lead.email) },
                  { label: "Website", value: websiteLink(info?.website ?? null) },
                ]}
              />
            </Section>

            <Section title="Notes">
              {lead.message ? (
                <p className="rounded-lg bg-[#F9FAFB] px-3.5 py-3 text-sm leading-[1.55] whitespace-pre-wrap text-ink">{lead.message}</p>
              ) : (
                <p className="text-sm text-ink-quiet">No notes on the card.</p>
              )}
            </Section>

            <Section title="Where they came from">
              <Fields
                items={[
                  {
                    label: "Came from",
                    value: (
                      <span className="flex items-center gap-2">
                        <SourceIcon source={lead.attribution.source} />
                        {lead.attribution.source}
                      </span>
                    ),
                  },
                  { label: "How they heard", value: lead.attribution.heardFrom },
                  { label: "Tags", value: info?.tags.length ? info.tags.join(", ") : null },
                ]}
              />
            </Section>

            <Section title="Status">
              <Fields
                items={[
                  { label: "Assigned to", value: info?.assignees.length ? info.assignees.join(", ") : "Unassigned" },
                  { label: "Added", value: lead.submittedAt ? formatDateTime(lead.submittedAt) : null },
                  { label: "Start date", value: info?.startDate ? formatDate(info.startDate) : null },
                  { label: "Due date", value: info?.dueDate ? formatDate(info.dueDate) : null },
                  { label: "Last updated in Teamwork", value: info?.updatedAt ? formatDateTime(info.updatedAt) : null },
                ]}
              />
            </Section>

            <Section title="Activity">
              {lead.activity.length === 0 ? (
                <p className="text-sm text-ink-quiet">No activity recorded yet.</p>
              ) : (
                <ActivityList activity={lead.activity} />
              )}
            </Section>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
