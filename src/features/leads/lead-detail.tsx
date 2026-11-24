"use client";

import { PeriodLink } from "@/components/layout/period-link";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { ChevronLeft, Pencil } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/data/empty-state";
import { Panel } from "@/components/data/panel";
import { StatusBadge } from "@/components/data/status-badge";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { leadPatchChanges, STAGE_META } from "@/lib/domain/leads";
import { CURRENCY, formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PIPELINE_STAGES, type Lead, type LeadOrigin, type PipelineStage } from "@/lib/types";
import { DealValueDialog } from "./deal-value-dialog";
import { EditContactDialog } from "./edit-contact-dialog";
import { parseDealValue } from "./lead-logic";
import { SourceIcon } from "./lead-ui";
import { useLeads } from "./leads-store";
import { SpamTag } from "./spam-tag";

const UNASSIGNED = "unassigned";

const ORIGIN_LABEL: Record<LeadOrigin, string> = {
  sheet: "Courtney's Google Sheet",
  "website-form": "Website form",
  manual: "Added in the dashboard",
};

/** Sheet dates are often typed without a time, so sheet leads show the date only. */
function submissionDate(lead: Lead): string | null {
  if (!lead.submittedAt) return null;
  return lead.origin === "sheet" ? formatDate(lead.submittedAt) : formatDateTime(lead.submittedAt);
}

/** Tracking fields, shown only when the lead has any (website-form leads). */
function trackingFields(lead: Lead) {
  const { medium, campaign, landingPage, referrer } = lead.attribution;
  if (!medium && !campaign && !landingPage && !referrer) return [];
  return [
    { label: "Medium", value: medium },
    { label: "Campaign", value: campaign },
    { label: "Landing page", value: landingPage },
    { label: "Referrer", value: referrer },
  ];
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Panel title={title} actions={action}>
      {children}
    </Panel>
  );
}

function Fields({ items }: { items: readonly { label: string; value: ReactNode }[] }) {
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

export function LeadDetail({ leadId }: { leadId: string }) {
  const { getLead, moveLead, updateLead, addNote } = useLeads();
  const lead = getLead(leadId);
  const [editOpen, setEditOpen] = useState(false);
  const [wonOpen, setWonOpen] = useState(false);

  if (!lead) {
    return (
      <PageBody>
        <EmptyState
          title="Lead not found"
          description="This lead is no longer in the list."
          action={
            <Button variant="outline" asChild>
              <PeriodLink href="/leads">Back to all leads</PeriodLink>
            </Button>
          }
        />
      </PageBody>
    );
  }


  function changeStage(next: string) {
    const stage = PIPELINE_STAGES.find((item) => item === next);
    if (!stage || !lead || stage === lead.stage) return;
    if (stage === "won") {
      setWonOpen(true);
      return;
    }
    moveLead(lead.id, stage);
    toast.success(`${lead.name} moved to ${STAGE_META[stage].label}`);
  }

  return (
    <PageBody>
      <PageHeader title={lead.name} description={lead.company || undefined} />
      <div className="flex flex-col gap-4">
        <BackLink />
        {/* The visible name repeats the screen-reader page heading above. */}
        <div aria-hidden className="flex min-w-0 flex-col gap-1.5">
          <p className="text-xl leading-tight font-semibold text-ink [overflow-wrap:anywhere]">{lead.name}</p>
          {lead.company && lead.company !== lead.name ? <p className="text-sm text-ink-quiet">{lead.company}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={STAGE_META[lead.stage].tone} label={STAGE_META[lead.stage].label} />
          <span className={cn("text-[13px] font-semibold tabular-nums", lead.stage === "won" ? "text-tone-good-fg" : "text-ink")}>
            {lead.dealValue === null ? <span className="font-normal text-ink-quiet">No deal value yet</span> : formatCurrency(lead.dealValue)}
          </span>
          {lead.spamFilteredBy ? <SpamTag by={lead.spamFilteredBy} /> : null}
        </div>
      </div>
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <Section
              title="Contact information"
              action={
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} aria-label="Edit contact information">
                  <Pencil aria-hidden />
                  Edit
                </Button>
              }
            >
              <Fields
                items={[
                  { label: "Name", value: lead.name },
                  { label: "Email", value: lead.email },
                  { label: "Phone", value: lead.phone },
                  { label: "Company", value: lead.company },
                ]}
              />
            </Section>
            <Section title="Submission">
              <div className="flex flex-col gap-3.5">
                {lead.message ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-ink-quiet">Original message</p>
                    <p className="rounded-lg bg-[#F9FAFB] px-3.5 py-3 text-sm leading-[1.55] whitespace-pre-wrap text-ink">{lead.message}</p>
                  </div>
                ) : null}
                <Fields
                  items={[
                    { label: "Submission date", value: submissionDate(lead) },
                    { label: "Recorded in", value: ORIGIN_LABEL[lead.origin] },
                    ...(lead.formName ? [{ label: "Form name", value: lead.formName }] : []),
                    ...(lead.pageUrl ? [{ label: "Submission page", value: lead.pageUrl }] : []),
                  ]}
                />
              </div>
            </Section>
            <Section title="Where they came from">
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
                  { label: "Heard from", value: lead.attribution.heardFrom },
                  ...trackingFields(lead),
                ]}
              />
            </Section>
            {lead.origin === "sheet" ? <SheetRecord lead={lead} /> : null}
          </div>
          <div className="flex flex-col gap-6">
            <Section title="Lead management">
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <StageField stage={lead.stage} onChange={changeStage} />
                  <AssigneeField lead={lead} />
                </div>
                <DealValueField key={lead.dealValue ?? "none"} lead={lead} />
                <NotesField lead={lead} onAdd={(body) => addNote(lead.id, body)} />
              </div>
            </Section>
            <Section title="Activity">
              {lead.activity.length === 0 ? (
                <p className="text-sm text-ink-quiet">No activity recorded yet.</p>
              ) : (
                <ol className="flex flex-col">
                  {[...lead.activity]
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                    .map((entry, index, all) => (
                      <li key={entry.id} className="relative flex flex-col gap-px pb-3.5 pl-5 last:pb-0">
                        <span aria-hidden className="absolute top-1.5 left-[3px] size-2 rounded-full bg-bar-muted" />
                        {index < all.length - 1 ? (
                          <span aria-hidden className="absolute top-4 bottom-0 left-1.5 w-0.5 bg-line" />
                        ) : null}
                        <p className="text-sm text-ink">{entry.description}</p>
                        <p className="text-xs text-ink-quiet">
                          {entry.actorName ?? "System"} · {formatDateTime(entry.createdAt)}
                        </p>
                      </li>
                    ))}
                </ol>
              )}
            </Section>
          </div>
        </div>
      <EditContactDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        lead={lead}
        onSave={(values) => {
          if (!leadPatchChanges(lead, values)) return;
          updateLead(lead.id, values);
          toast.success("Contact information updated");
        }}
      />
      <DealValueDialog
        open={wonOpen}
        onOpenChange={setWonOpen}
        leadName={lead.name}
        initialValue={lead.dealValue}
        onConfirm={(value) => {
          moveLead(lead.id, "won", value);
          toast.success(`${lead.name} marked Won at ${formatCurrency(value)}`);
        }}
      />
    </PageBody>
  );
}

/** What Courtney's sheet records about the deal: her note, the close date, and payments. */
function SheetRecord({ lead }: { lead: Lead }) {
  const received = lead.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const commission = lead.payments.reduce((sum, payment) => sum + (payment.commission ?? 0), 0);
  return (
    <Section title="Pipeline record">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-ink-quiet">Notes / lost reason</p>
          <p className="text-sm whitespace-pre-wrap text-ink">{lead.pipelineNote || "—"}</p>
        </div>
        <Fields items={[{ label: "Close date", value: lead.wonOn ? formatDate(lead.wonOn) : null }]} />
        <div>
          <h3 className="text-xs text-ink-quiet">Payments</h3>
          {lead.payments.length === 0 ? (
            <p className="mt-0.5 text-sm text-ink-quiet">None recorded.</p>
          ) : (
            <table className="mt-1.5 w-full text-[13px]">
              <caption className="sr-only">Payments received for this lead</caption>
              <thead>
                <tr className="text-left text-xs text-ink-quiet">
                  <th scope="col" className="py-1.5 font-medium">Payment</th>
                  <th scope="col" className="py-1.5 text-right font-medium">Revenue</th>
                  <th scope="col" className="py-1.5 text-right font-medium">Commission</th>
                </tr>
              </thead>
              <tbody className="text-ink-body tabular-nums">
                {lead.payments.map((payment) => (
                  <tr key={payment.sequence} className="border-t border-line-soft">
                    <th scope="row" className="py-2 text-left font-normal">Month {payment.sequence}</th>
                    <td className="py-2 text-right">{formatMoney(payment.amount)}</td>
                    <td className="py-2 text-right">{payment.commission === null ? "—" : formatMoney(payment.commission)}</td>
                  </tr>
                ))}
                <tr className="border-t border-line font-semibold text-ink">
                  <th scope="row" className="py-2 text-left">Total</th>
                  <td className="py-2 text-right">{formatMoney(received)}</td>
                  <td className="py-2 text-right">{formatMoney(commission)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Section>
  );
}

/** Exact amounts, cents included: these are payroll figures. */
const moneyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: CURRENCY });
function formatMoney(value: number): string {
  return moneyFormatter.format(value);
}

function StageField({ stage, onChange }: { stage: PipelineStage; onChange: (value: string) => void }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Stage</Label>
      <Select value={stage} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PIPELINE_STAGES.map((item) => (
            <SelectItem key={item} value={item}>
              {STAGE_META[item].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function AssigneeField({ lead }: { lead: Lead }) {
  const { team, updateLead } = useLeads();
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Assigned to</Label>
      <Select
        value={lead.assigneeId ?? UNASSIGNED}
        onValueChange={(value) => {
          const assigneeId = value === UNASSIGNED ? null : value;
          updateLead(lead.id, { assigneeId });
          const name = team.find((member) => member.id === assigneeId)?.name;
          toast.success(name ? `${lead.name} assigned to ${name}` : `${lead.name} unassigned`);
        }}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
          {team.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function DealValueField({ lead }: { lead: Lead }) {
  const { updateLead } = useLeads();
  const id = useId();
  const [text, setText] = useState(lead.dealValue ? String(lead.dealValue) : "");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (trimmed === "" && lead.stage !== "won") {
      if (lead.dealValue === null) return;
      updateLead(lead.id, { dealValue: null });
      toast.success("Deal value cleared");
      return;
    }
    const value = parseDealValue(trimmed);
    if (value === null) {
      setError("Enter a deal value greater than zero, for example 12500.");
      return;
    }
    if (value === lead.dealValue) return;
    updateLead(lead.id, { dealValue: value });
    toast.success(`Deal value set to ${formatCurrency(value)}`);
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Deal value (USD)</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setError(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <Button type="submit" variant="outline">
          Update
        </Button>
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function NotesField({
  lead,
  onAdd,
}: {
  lead: Lead;
  onAdd: (body: string) => void;
}) {
  const id = useId();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) {
      setError("Write a note before adding it.");
      return;
    }
    onAdd(body);
    setBody("");
    toast.success("Note added");
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={submit} noValidate className="flex flex-col gap-1.5">
        <Label htmlFor={id}>Add a note</Label>
        <Textarea
          id={id}
          rows={3}
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            setError(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {error ? (
          <p id={`${id}-error`} className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" variant="outline" className="self-start">
          Add note
        </Button>
      </form>
      <div>
        <h3 className="text-[13px] font-semibold text-ink">Notes ({lead.notes.length})</h3>
        {lead.notes.length === 0 ? (
          <p className="mt-1 text-sm text-ink-quiet">No notes yet.</p>
        ) : (
          <ul className="mt-1 flex flex-col">
            {[...lead.notes]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((note) => (
                <li key={note.id} className="border-b border-line-soft py-2.5 last:border-b-0">
                  <p className="text-sm whitespace-pre-wrap text-ink">{note.body}</p>
                  <p className="mt-0.5 text-xs text-ink-quiet">
                    {note.authorName} · {formatDateTime(note.createdAt)}
                  </p>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
