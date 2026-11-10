"use client";

import { useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { AppNotification, ISODate, SessionUser } from "@/lib/types";
import { SidebarBrand, SidebarNav } from "./sidebar-nav";
import { SidebarUser } from "./sidebar-user";
import { Topbar } from "./topbar";

export function AppShell({
  user,
  today,
  notifications,
  children,
}: {
  user: SessionUser;
  today: ISODate;
  notifications: Promise<AppNotification[]>;
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
        <SidebarUser user={user} />
      </aside>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="flex w-72 flex-col gap-0 p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Main navigation for the dashboard.</SheetDescription>
          <SidebarBrand />
          <SidebarNav onNavigate={() => setMenuOpen(false)} />
          <SidebarUser user={user} onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          today={today}
          notifications={notifications}
          onOpenMenu={() => setMenuOpen(true)}
        />
        <main id="main" className="relative min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
