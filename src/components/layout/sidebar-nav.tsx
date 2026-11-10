"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { PhaseBadge } from "@/components/data/phase-badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { findActiveNav, NAVIGATION, type NavGroup } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { usePeriodHref } from "./period-link";

const rowClass =
  "flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-sm font-medium outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring";
const activeClass = "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent";

function NavGroupRow({
  group,
  activeHref,
  onNavigate,
}: {
  group: NavGroup;
  activeHref: string | undefined;
  onNavigate?: () => void;
}) {
  const withPeriod = usePeriodHref();
  const containsActive = group.items.some((item) => item.href === activeHref);
  const [manuallyOpen, setManuallyOpen] = useState(false);
  const Icon = group.icon;
  const only = group.items[0];

  if (group.items.length === 1 && only) {
    return (
      <Link
        href={withPeriod(only.href)}
        onClick={onNavigate}
        aria-current={containsActive ? "page" : undefined}
        className={cn(rowClass, containsActive && activeClass)}
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{group.label}</span>
        {only.phase ? <PhaseBadge phase={only.phase} className="ml-auto" /> : null}
      </Link>
    );
  }

  // The section holding the current page always stays visible.
  const open = containsActive || manuallyOpen;

  return (
    <Collapsible open={open} onOpenChange={setManuallyOpen}>
      <CollapsibleTrigger className={cn(rowClass, "text-left")}>
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{group.label}</span>
        <ChevronRight
          className={cn("ml-auto size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-0.5 ml-[1.1rem] flex flex-col gap-0.5 border-l border-border pl-2.5">
          {group.items.map((item) => {
            const active = item.href === activeHref;
            return (
              <li key={item.href}>
                <Link
                  href={withPeriod(item.href)}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(rowClass, "h-8 font-normal", active && cn(activeClass, "font-medium"))}
                >
                  <span className="truncate">{item.label}</span>
                  {item.phase && item.phase !== "P1" ? (
                    <PhaseBadge phase={item.phase} className="ml-auto" />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const activeHref = findActiveNav(pathname)?.item.href;

  return (
    <nav aria-label="Main" className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
      {NAVIGATION.map((group) => (
        <NavGroupRow key={group.id} group={group} activeHref={activeHref} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

export function SidebarBrand() {
  return (
    <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4">
      <span
        className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground"
        aria-hidden
      >
        RL
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-semibold">SEO Dashboard</span>
        <span className="block truncate text-xs text-muted-foreground">RightLeft Agency</span>
      </span>
    </div>
  );
}
