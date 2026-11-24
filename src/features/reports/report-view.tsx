"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Printer, Unlock } from "lucide-react";
import { toast } from "sonner";
import { Panel } from "@/components/data/panel";
import { StatusBadge } from "@/components/data/status-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { MonthlyReportView, ReportNotes } from "@/lib/data/reports";
import { formatDate, formatDateTime } from "@/lib/format";
import { finalizeReport, reopenReport, saveReportNotes } from "@/server/reports/actions";
import { REPORT_STATUS_META } from "./reports-meta";
import { ReportSections } from "./report-sections";

const NOTE_FIELDS: { key: keyof ReportNotes; label: string; hint: string }[] = [
  { key: "highlights", label: "Highlights", hint: "What went well this month." },
  { key: "missed", label: "What didn't happen", hint: "Planned work that slipped, and why." },
  { key: "nextMonth", label: "Next month", hint: "Priorities for the coming month." },
];

function Notes({ view }: { view: MonthlyReportView }) {
  const router = useRouter();
  const [notes, setNotes] = useState(view.notes);
  const [saving, startSaving] = useTransition();
  const editable = view.canEdit && view.status === "draft";
  const dirty = NOTE_FIELDS.some(({ key }) => notes[key] !== view.notes[key]);
  const empty = NOTE_FIELDS.every(({ key }) => !view.notes[key].trim());

  const save = () =>
    startSaving(async () => {
      const result = await saveReportNotes(view.month, notes);
      if (result.ok) {
        toast.success("Notes saved.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });

  return (
    <Panel title="Summary" className="print:border-line" bodyClassName="flex flex-col gap-4">
      {editable ? (
        <div className="flex flex-col gap-4 print:hidden">
          {NOTE_FIELDS.map(({ key, label, hint }) => (
            <label key={key} className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-ink">{label}</span>
              <span className="text-xs text-ink-quiet">{hint}</span>
              <Textarea
                value={notes[key]}
                onChange={(event) => setNotes((current) => ({ ...current, [key]: event.target.value }))}
                rows={3}
                maxLength={5000}
              />
            </label>
          ))}
          <div>
            <Button size="lg" onClick={save} disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save notes"}
            </Button>
          </div>
        </div>
      ) : null}
      {/* Read-only text: always when not editable, and in print. */}
      <dl className={editable ? "hidden flex-col gap-4 print:flex" : "flex flex-col gap-4"}>
        {empty ? (
          <p className="text-[13px] text-ink-quiet">
            No summary written{view.canEdit ? "." : " yet. Admins and managers can add one."}
          </p>
        ) : (
          NOTE_FIELDS.filter(({ key }) => view.notes[key].trim()).map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-1">
              <dt className="text-sm font-semibold text-ink">{label}</dt>
              <dd className="text-sm leading-relaxed whitespace-pre-line text-ink-body">{view.notes[key]}</dd>
            </div>
          ))
        )}
      </dl>
    </Panel>
  );
}

export function ReportView({ view, monthLabel }: { view: MonthlyReportView; monthLabel: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const meta = REPORT_STATUS_META[view.status];

  const run = (action: () => Promise<{ ok: true } | { ok: false; error: string }>, success: string) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(success);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });

  return (
    <>
      <div className="flex flex-col gap-1">
        <h2 className="text-[22px] leading-tight font-semibold tracking-tight text-ink">{monthLabel} report</h2>
        <p className="text-[13px] text-ink-quiet">Right Left Agency · SEO report</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-3.5 print:border-0 print:p-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-quiet">
          <StatusBadge tone={meta.tone} label={view.status === "ready" ? "Final" : meta.label} />
          <span>
            {view.status === "draft"
              ? `Live figures, compared with the month before. Generated ${formatDateTime(view.data.generatedAt)}.`
              : `Finalised ${view.finalizedAt ? formatDate(view.finalizedAt) : ""}. Figures are frozen as of ${formatDateTime(view.data.generatedAt)}.`}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="outline" size="lg" onClick={() => window.print()}>
            <Printer aria-hidden />
            Print / Save as PDF
          </Button>
          {view.canEdit && view.status === "draft" ? (
            <Button size="lg" onClick={() => run(() => finalizeReport(view.month), `${monthLabel} report finalised.`)} disabled={pending}>
              <Lock aria-hidden />
              {pending ? "Finalising…" : "Finalise report"}
            </Button>
          ) : null}
          {view.canEdit && view.status !== "draft" ? (
            <Button variant="outline" size="lg" onClick={() => run(() => reopenReport(view.month), "Report reopened as a draft.")} disabled={pending}>
              <Unlock aria-hidden />
              Reopen
            </Button>
          ) : null}
        </div>
      </div>
      {view.status === "draft" && view.canEdit ? (
        <p className="text-xs text-ink-quiet print:hidden">
          Finalising freezes this month&rsquo;s figures and notes, so the report reads the same every time it is opened. You can reopen it later.
        </p>
      ) : null}

      <Notes key={`${view.status}-${view.notes.highlights}-${view.notes.missed}-${view.notes.nextMonth}`} view={view} />
      <ReportSections data={view.data} />
    </>
  );
}
