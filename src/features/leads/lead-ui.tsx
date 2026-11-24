"use client";

import {
  Globe,
  KanbanSquare,
  Link2,
  List,
  Mail,
  MousePointerClick,
  Search,
  Share2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { SegmentedControl } from "@/components/data/segmented-control";
import { CURRENCY } from "@/lib/format";
import type { LeadSource, PipelineStage, StatusTone } from "@/lib/types";
import { STAGE_META } from "@/lib/domain/leads";
import { cn } from "@/lib/utils";

const SOURCE_ICON: Partial<Record<LeadSource, LucideIcon>> = {
  "Organic Search": Search,
  "AI Search": Sparkles,
  Referral: Link2,
  "Paid Search": MousePointerClick,
  Social: Share2,
  Direct: Globe,
  Email: Mail,
};

/**
 * The design's small source box in front of "Came from": an outlined icon for
 * a known channel, a grey dot when the channel is unknown. Decorative: the
 * source name always follows it as text.
 */
export function SourceIcon({ source, className }: { source: LeadSource; className?: string }) {
  const Icon = SOURCE_ICON[source];
  return Icon ? (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-[5px] border border-input bg-card text-ink-body",
        className,
      )}
    >
      <Icon className="size-3" />
    </span>
  ) : (
    <span aria-hidden className={cn("inline-flex size-5 shrink-0 items-center justify-center rounded-[5px] bg-tone-neutral-bg", className)}>
      <span className="size-1.5 rounded-full bg-[#9CA3AF]" />
    </span>
  );
}

const DOT_CLASS: Record<StatusTone, string> = {
  good: "bg-status-good",
  warning: "bg-status-warning",
  serious: "bg-status-serious",
  critical: "bg-status-critical",
  info: "bg-status-info",
  neutral: "bg-status-neutral",
};

/** The stage colour as a dot, for board column headers. The stage name sits beside it. */
export function StageDot({ stage }: { stage: PipelineStage }) {
  return <span aria-hidden className={cn("size-2 shrink-0 rounded-full", DOT_CLASS[STAGE_META[stage].tone])} />;
}

const compactMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: CURRENCY,
  notation: "compact",
  maximumFractionDigits: 1,
});

/** `18000` becomes `$18K`. For KPI figures and card corners, not tables. */
export function formatMoneyShort(value: number): string {
  return compactMoney.format(value);
}

export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** List | Pipeline. Each view has its own route, so the options are links. */
export function LeadViewSwitch({ view }: { view: "list" | "pipeline" }) {
  return (
    <SegmentedControl
      label="Lead view"
      value={view}
      options={[
        { value: "list", label: "List", icon: List, href: "/leads" },
        { value: "pipeline", label: "Pipeline", icon: KanbanSquare, href: "/leads/pipeline" },
      ]}
    />
  );
}

/** The design's quiet text toggle at the right of the toolbar, e.g. "Show spam (3)". */
export function ToolbarTextButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-7 rounded-md px-2 text-xs font-medium whitespace-nowrap text-ink-body outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </button>
  );
}

/** "Clear filters": a blue text button that appears once any filter is set. */
export function ClearFiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-9 rounded-lg px-2.5 text-[13px] font-medium whitespace-nowrap text-primary outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
    >
      Clear filters
    </button>
  );
}

/** A filter dropdown that is set reads as active: light blue, like the design. */
export const ACTIVE_FILTER_CLASS = "border-[#B3DBFF] bg-tone-info-bg font-semibold text-tone-info-fg";
