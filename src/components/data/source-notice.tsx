import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export type SourceIssue =
  | { status: "not-connected"; message: string }
  | { status: "empty"; message: string }
  | { status: "error"; message: string };

/** Why a data source shows nothing: not set up yet, no complete day yet, or a failed request. */
export function SourceNotice({ source, className }: { source: SourceIssue; className?: string }) {
  return (
    <div className={cn("flex items-start gap-2 text-[13px]", className)}>
      <Info
        className={cn("mt-0.5 size-4 shrink-0", source.status === "error" ? "text-status-warning" : "text-muted-foreground")}
        aria-hidden
      />
      <p className="text-ink-quiet">
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
  );
}
