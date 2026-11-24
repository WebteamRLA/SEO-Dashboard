import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  titleAs = "p",
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Render the title as the page heading, for full-page states. */
  titleAs?: "p" | "h1" | "h2";
}) {
  const Title = titleAs;
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {Icon ? (
        <span className="mb-1 flex size-10 items-center justify-center rounded-full bg-tone-neutral-bg">
          <Icon className="size-5 text-ink-quiet" aria-hidden />
        </span>
      ) : null}
      <Title className="text-sm font-semibold text-ink">{title}</Title>
      {description ? <p className="max-w-md text-[13px] text-ink-quiet">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
