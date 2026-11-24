"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { PhaseBadge } from "@/components/data/phase-badge";
import { findActiveNav, NAV_SECTION_LABEL, NAVIGATION, type NavGroup, type NavSection } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { usePeriodHref } from "./period-link";

const rowClass =
  "flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-sidebar-foreground outline-none transition-colors hover:bg-[#1118270d] hover:text-ink-body focus-visible:ring-2 focus-visible:ring-ring";

function NavLink({ group, active, onNavigate }: { group: NavGroup; active: boolean; onNavigate?: () => void }) {
  const withPeriod = usePeriodHref();
  const pathname = usePathname();
  const Icon = group.icon;
  const target = group.items[0];
  if (!target) return null;
  return (
    <Link
      href={withPeriod(target.href)}
      onClick={onNavigate}
      aria-current={active ? (pathname === target.href ? "page" : "true") : undefined}
      className={cn(rowClass, active && "bg-sidebar-accent hover:bg-sidebar-accent")}
    >
      <Icon className="size-[18px] shrink-0" strokeWidth={2} aria-hidden />
      <span className="truncate">{group.label}</span>
      {group.phase ? <PhaseBadge phase={group.phase} className="ml-auto" /> : null}
    </Link>
  );
}

function useActiveGroupId() {
  const pathname = usePathname();
  return findActiveNav(pathname)?.group.id;
}

const MAIN_SECTIONS: NavSection[] = ["main", "results", "work", "reports"];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const activeId = useActiveGroupId();

  return (
    <nav aria-label="Dashboard" className="flex flex-col gap-5">
      {MAIN_SECTIONS.map((section) => {
        const groups = NAVIGATION.filter((group) => group.section === section);
        if (groups.length === 0) return null;
        const heading = NAV_SECTION_LABEL[section];
        const headingId = `nav-${section}`;
        return (
          <div
            key={section}
            role={heading ? "group" : undefined}
            aria-labelledby={heading ? headingId : undefined}
            className="flex flex-col gap-0.5"
          >
            {heading ? (
              <span id={headingId} className="flex h-6 items-center px-2.5 text-xs font-semibold tracking-[0.04em] text-ink-quiet uppercase">
                {heading}
              </span>
            ) : null}
            {groups.map((group) => (
              <NavLink key={group.id} group={group} active={group.id === activeId} onNavigate={onNavigate} />
            ))}
          </div>
        );
      })}
    </nav>
  );
}

/** Settings and anything else pinned above the account row. */
export function SidebarFooterNav({ onNavigate }: { onNavigate?: () => void }) {
  const activeId = useActiveGroupId();
  return (
    <div className="flex flex-col gap-0.5">
      {NAVIGATION.filter((group) => group.section === "footer").map((group) => (
        <NavLink key={group.id} group={group} active={group.id === activeId} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

export function SidebarBrand({ onNavigate }: { onNavigate?: () => void }) {
  const withPeriod = usePeriodHref();
  return (
    <div className="-mx-3 flex h-16 shrink-0 items-center border-b border-sidebar-border pr-4 pl-[18px]">
      <div className="flex min-w-0 flex-col gap-1">
        <Link href={withPeriod("/overview")} onClick={onNavigate} className="flex items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/rla-logo.svg" alt="Right Left Agency" width={166} height={17} className="block h-auto w-[166px]" />
        </Link>
        <span className="pl-5 text-[11px] leading-[1.2] tracking-[0.08em] text-[#556cce] uppercase">Client dashboard</span>
      </div>
    </div>
  );
}
