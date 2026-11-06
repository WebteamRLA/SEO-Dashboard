"use client";

import { useState, type ReactNode } from "react";
import { FlaskConical } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { AppNotification, MonthKey, TeamMember } from "@/lib/types";
import { SidebarBrand, SidebarNav } from "./sidebar-nav";
import { Topbar } from "./topbar";

export function AppShell({
  user,
  months,
  defaultMonth,
  notifications,
  children,
}: {
  user: TeamMember;
  months: MonthKey[];
  defaultMonth: MonthKey;
  notifications: AppNotification[];
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>

      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <SidebarBrand />
        <SidebarNav />
      </aside>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="flex w-72 flex-col gap-0 p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Main navigation for the dashboard.</SheetDescription>
          <SidebarBrand />
          <SidebarNav onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          user={user}
          months={months}
          defaultMonth={defaultMonth}
          notifications={notifications}
          onOpenMenu={() => setMenuOpen(true)}
        />
        {/* The topbar chip has no room on phones, and sample figures must stay marked. */}
        <p className="flex shrink-0 items-center justify-center gap-1.5 border-b border-border bg-muted px-3 py-1 text-xs text-muted-foreground md:hidden">
          <FlaskConical className="size-3.5" aria-hidden />
          Sample data, not live RLA figures
        </p>
        <main id="main" className="relative min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
