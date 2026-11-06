"use client";

import { MonthLink } from "@/components/layout/month-link";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, Pencil } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/data/empty-state";
import { StatusBadge } from "@/components/data/status-badge";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { leadPatchChanges, STAGE_META } from "@/lib/domain/leads";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { PIPELINE_STAGES, type Lead, type PipelineStage } from "@/lib/types";
import { DealValueDialog } from "./deal-value-dialog";
import { EditContactDialog } from "./edit-contact-dialog";
import { parseDealValue } from "./lead-logic";
import { useLeads } from "./leads-store";
import { PreviewChangesNote } from "./preview-changes-note";
import { SpamTag } from "./spam-tag";

const UNASSIGNED = "unassigned";

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Fields({ items }: { items: readonly { label: string; value: string | null }[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="mt-0.5 text-sm break-words">{item.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function LeadDetail({ leadId }: { leadId: string }) {
  const { getLead, team, moveLead, updateLead, addNote } = useLeads();
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
              <MonthLink href="/leads">Back to Lead Inbox</MonthLink>
            </Button>
          }
        />
      </PageBody>
    );
  }

  const authorName = (id: string | null) =>
    id === null ? "System" : (team.find((member) => member.id === id)?.name ?? "Unknown user");

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
      <MonthLink
        href="/leads"
        className="inline-flex w-fit items-center gap-1 rounded-sm text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Lead Inbox
      </MonthLink>
      <PageHeader
        title={lead.name}
        description={lead.company || undefined}
        actions={
          <>
            {lead.spamFilteredBy ? <SpamTag by={lead.spamFilteredBy} /> : null}
            <StatusBadge tone={STAGE_META[lead.stage].tone} label={STAGE_META[lead.stage].label} />
          </>
        }
      />
      <PreviewChangesNote />
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <Section
              title="Contact Information"
              action={
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
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
            <Section title="Submission Information">
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Original message</p>
                  <p className="mt-0.5 text-sm whitespace-pre-wrap">{lead.message || "—"}</p>
                </div>
                <Fields
                  items={[
                    { label: "Form name", value: lead.formName },
                    { label: "Submission page", value: lead.pageUrl },
                    { label: "Submission date", value: formatDateTime(lead.submittedAt) },
                  ]}
                />
              </div>
            </Section>
            <Section title="Attribution">
              <Fields
                items={[
                  { label: "Source", value: lead.attribution.source },
                  { label: "Medium", value: lead.attribution.medium },
                  { label: "Campaign", value: lead.attribution.campaign },
                  { label: "Landing page", value: lead.attribution.landingPage },
                  { label: "Referrer", value: lead.attribution.referrer },
                ]}
              />
            </Section>
          </div>
          <div className="flex flex-col gap-5">
            <Section title="Lead Management">
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <StageField stage={lead.stage} onChange={changeStage} />
                  <AssigneeField lead={lead} />
                </div>
                <DealValueField key={lead.dealValue ?? "none"} lead={lead} />
                <NotesField lead={lead} authorName={authorName} onAdd={(body) => addNote(lead.id, body)} />
              </div>
            </Section>
            <Section title="Activity History">
              {lead.activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
              ) : (
                <ol className="flex flex-col">
                  {[...lead.activity]
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                    .map((entry) => (
                      <li key={entry.id} className="flex flex-col gap-0.5 border-b border-border py-2.5 first:pt-0 last:border-b-0 last:pb-0">
                        <p className="text-sm">{entry.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {authorName(entry.actorId)} · {formatDateTime(entry.createdAt)}
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
  authorName,
  onAdd,
}: {
  lead: Lead;
  authorName: (id: string | null) => string;
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
        <h3 className="text-xs text-muted-foreground">Notes ({lead.notes.length})</h3>
        {lead.notes.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          <ul className="mt-1 flex flex-col">
            {[...lead.notes]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((note) => (
                <li key={note.id} className="border-b border-border py-2.5 last:border-b-0">
                  <p className="text-sm whitespace-pre-wrap">{note.body}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {authorName(note.authorId)} · {formatDateTime(note.createdAt)}
                  </p>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
