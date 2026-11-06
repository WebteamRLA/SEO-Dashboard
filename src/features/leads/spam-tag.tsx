import type { SpamFilteredBy } from "@/lib/types";
import { SPAM_TAG_LABEL } from "@/lib/domain/leads";

export function SpamTag({ by }: { by: SpamFilteredBy }) {
  return (
    <span className="inline-flex h-5 items-center rounded-sm border border-border bg-muted px-1.5 text-[11px] font-medium whitespace-nowrap text-muted-foreground">
      {SPAM_TAG_LABEL[by]}
    </span>
  );
}
