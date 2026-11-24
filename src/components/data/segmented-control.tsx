"use client";

import type { LucideIcon } from "lucide-react";
import { PeriodLink } from "@/components/layout/period-link";
import { cn } from "@/lib/utils";

export interface SegmentOption<V extends string = string> {
  value: V;
  label: string;
  icon?: LucideIcon;
  /** A real link instead of a toggle, for views that live on their own route. */
  href?: string;
}

const itemClass =
  "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring";
const onClass = "bg-card font-semibold text-ink shadow-[0_1px_2px_#11182714]";
const offClass = "font-medium text-ink-body hover:text-ink";

/**
 * The design's grey pill toggle ("List | Pipeline", "Clicks | Impressions").
 * Options with `href` render as links with `aria-current`; the rest as toggle
 * buttons with `aria-pressed`.
 */
export function SegmentedControl<V extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  /** Accessible name for the group. */
  label: string;
  options: readonly SegmentOption<V>[];
  value: V;
  onChange?: (value: V) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex h-9 gap-0.5 rounded-lg bg-sidebar-accent p-0.5", className)}>
      {options.map((option) => {
        const on = option.value === value;
        const Icon = option.icon;
        const content = (
          <>
            {Icon ? <Icon className="size-[15px]" aria-hidden /> : null}
            {option.label}
          </>
        );
        return option.href ? (
          <PeriodLink
            key={option.value}
            href={option.href}
            aria-current={on ? "page" : undefined}
            className={cn(itemClass, on ? onClass : offClass)}
          >
            {content}
          </PeriodLink>
        ) : (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange?.(option.value)}
            className={cn(itemClass, on ? onClass : offClass)}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
