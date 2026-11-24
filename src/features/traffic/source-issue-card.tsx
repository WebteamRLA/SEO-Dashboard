import { Panel } from "@/components/data/panel";
import { SourceNotice } from "@/components/data/source-notice";
import type { SourceResult } from "@/lib/data/google";

/** A panel explaining why one Google source shows nothing. */
export function SourceIssueCard({
  title,
  source,
}: {
  title: string;
  source: Exclude<SourceResult<unknown>, { status: "ok" }>;
}) {
  return (
    <Panel title={title}>
      <SourceNotice source={source} />
    </Panel>
  );
}
