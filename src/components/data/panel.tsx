import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The design's main surface: a 12px-rounded white panel with a header band
 * (title, one line of context, actions on the right) and a body. Use `flush`
 * when the body is a table or list that runs edge to edge.
 */
export function Panel({
  title,
  description,
  actions,
  toolbar,
  children,
  flush = false,
  headingLevel = 2,
  id,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** A second header row, for search and filters. */
  toolbar?: ReactNode;
  children?: ReactNode;
  flush?: boolean;
  headingLevel?: 2 | 3;
  id?: string;
  className?: string;
  bodyClassName?: string;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const hasHeader = title || description || actions || toolbar;
  return (
    <section
      aria-labelledby={title && id ? `${id}-title` : undefined}
      className={cn("flex min-w-0 flex-col rounded-xl border border-border bg-card", className)}
    >
      {hasHeader ? (
        <div className="flex flex-col gap-3.5 border-b border-border px-5 py-3">
          {title || description || actions ? (
            <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <div className="flex min-w-0 flex-col gap-px">
                {title ? (
                  <Heading id={id ? `${id}-title` : undefined} className="text-base font-semibold text-ink">
                    {title}
                  </Heading>
                ) : null}
                {description ? <p className="text-xs text-ink-quiet">{description}</p> : null}
              </div>
              {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
            </div>
          ) : null}
          {toolbar}
        </div>
      ) : null}
      {flush ? children : <div className={cn("p-5", bodyClassName)}>{children}</div>}
    </section>
  );
}

/** A titled block inside a panel body, such as "Leads over time". */
export function PanelBlock({
  title,
  description,
  aside,
  children,
  headingLevel = 3,
  className,
}: {
  title: ReactNode;
  /** One level below the panel's own heading: 4 inside a `headingLevel={3}` panel. */
  headingLevel?: 3 | 4;
  description?: ReactNode;
  /** Right of the title: a legend or a small control. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h4";
  return (
    <div className={cn("flex min-w-0 flex-col gap-3.5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Heading className="text-sm font-semibold text-ink">{title}</Heading>
          {description ? <p className="text-xs text-ink-quiet">{description}</p> : null}
        </div>
        {aside}
      </div>
      {children}
    </div>
  );
}

/** Two or more blocks side by side in a panel body; they stack below 720px. */
export function PanelColumns({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 gap-10 min-[720px]:grid-cols-2", className)}>{children}</div>;
}

/** Small uppercase heading above a group of tiles and panels. */
export function SectionLabel({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="text-xs leading-[18px] font-semibold tracking-[0.04em] text-ink-quiet uppercase">
      {children}
    </h2>
  );
}

/** A labelled group: section label, then its tiles and panels. */
export function PageSection({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <SectionLabel>{label}</SectionLabel>
      {children}
    </section>
  );
}

/** A legend entry: a small square swatch and its label. */
export function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-[5px] text-xs text-ink-quiet">
      <span className="size-2 rounded-[2px]" style={{ backgroundColor: color }} aria-hidden />
      {label}
    </span>
  );
}

export function Legend({ children }: { children: ReactNode }) {
  return <span className="flex flex-wrap items-center gap-3">{children}</span>;
}
