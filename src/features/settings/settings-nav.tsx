"use client";

import { MonthLink } from "@/components/layout/month-link";
import { usePathname } from "next/navigation";
import { NAVIGATION } from "@/config/navigation";
import { cn } from "@/lib/utils";

/** Section links for every settings page. Real links, so each URL can be opened directly. */
export function SettingsNav() {
  const pathname = usePathname();
  const items = NAVIGATION.find((group) => group.id === "settings")?.items ?? [];

  return (
    <nav aria-label="Settings sections" className="overflow-x-auto border-b border-border">
      <ul className="flex min-w-max gap-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <MonthLink
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex h-9 items-center border-b-2 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-t-md",
                  active
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </MonthLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
