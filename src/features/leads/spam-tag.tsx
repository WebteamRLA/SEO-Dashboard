import type { SpamFilteredBy } from "@/lib/types";
import { SPAM_TAG_LABEL } from "@/lib/domain/leads";
import { cn } from "@/lib/utils";

export function SpamTag({ by, className }: { by: SpamFilteredBy; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded bg-tone-neutral-bg px-1.5 text-[11px] font-medium whitespace-nowrap text-ink-quiet",
        className,
      )}
    >
      {SPAM_TAG_LABEL[by]}
    </span>
  );
}
