import { Info } from "lucide-react";

/** Shown in place of leads when the Teamwork Pipeline board could not be loaded. */
export function PipelineUnavailable({ message }: { message: string }) {
  return (
    <div className="m-5 flex items-start gap-2.5 rounded-xl border border-[var(--tile-amber)] bg-[#fffbeb] px-4 py-3 text-[13px]">
      <Info className="mt-0.5 size-4 shrink-0 text-status-warning" aria-hidden />
      <p className="text-ink-body">
        <span className="font-semibold text-ink">Leads could not be loaded from Teamwork.</span> {message} Try Sync
        again in a minute.
      </p>
    </div>
  );
}
