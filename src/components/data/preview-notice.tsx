import { Info } from "lucide-react";
import type { Phase } from "@/lib/types";

/** Marks a page as a planned preview, so sample figures are never read as real. */
export function PreviewNotice({ phase, children }: { phase: Exclude<Phase, "P1">; children?: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm">
      <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground">Planned for {phase}.</span>{" "}
        {children ?? "This is a preview of the layout using sample figures. No live data is connected."}
      </p>
    </div>
  );
}
