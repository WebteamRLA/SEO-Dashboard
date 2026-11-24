import type { ReactNode } from "react";
import type { Phase } from "@/lib/types";

/**
 * The top of every page. The design carries no visible page title (the sidebar
 * and the topbar name the page), so the title is a screen-reader heading.
 * `description` stays available to assistive tech too. `actions` render as a
 * right-aligned toolbar. `phase` is shown by the page's PreviewNotice instead.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  phase?: Phase;
  actions?: ReactNode;
}) {
  return (
    <>
      <div className="sr-only print:not-sr-only print:mb-2">
        <h1 className="print:text-xl print:font-semibold">{title}</h1>
        {description ? <p className="print:text-sm print:text-ink-quiet">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">{actions}</div> : null}
    </>
  );
}

/** Standard vertical rhythm for a page's sections. */
export function PageBody({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-6">{children}</div>;
}
