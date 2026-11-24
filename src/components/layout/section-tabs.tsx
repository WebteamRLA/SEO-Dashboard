"use client";

import { usePathname } from "next/navigation";
import { PeriodLink } from "@/components/layout/period-link";
import { findSectionTabs } from "@/config/navigation";
import { cn } from "@/lib/utils";

/**
 * Underlined tabs across the top of a section with several pages (Traffic,
 * Site health, Settings). Real links, so each tab has its own URL.
 */
export function SectionTabs() {
  const pathname = usePathname();
  const tabs = findSectionTabs(pathname);
  if (!tabs) return null;

  return (
    <nav aria-label={`${tabs.group.label} pages`} className="scroll-thin -mt-1 mb-6 overflow-x-auto border-b border-border print:hidden">
      <ul className="flex min-w-max gap-6">
        {tabs.group.items.map((item) => {
          const active = item.href === tabs.activeHref;
          return (
            <li key={item.href}>
              <PeriodLink
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex h-11 items-center gap-2 rounded-t-sm border-b-2 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-primary font-semibold text-ink"
                    : "border-transparent font-medium text-ink-body hover:text-ink",
                )}
              >
                {item.tabLabel ?? item.label}
              </PeriodLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
