import { Info } from "lucide-react";

/**
 * Stands in for PreviewNotice on the Lead Filter Agent, whose phase is P1.
 * PreviewNotice accepts only P2 and P3.
 */
export function LeadFilterNotice() {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm">
      <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <p className="text-muted-foreground">
        Basic spam filtering is part of P1 and arrives with the backend step. Nothing is running yet. The tags and Spam
        stage shown in Leads are sample data.
      </p>
    </div>
  );
}
