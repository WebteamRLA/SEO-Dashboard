"use client";

import { useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { AppNotification, ISODate, SessionUser } from "@/lib/types";
import { SectionTabs } from "./section-tabs";
import { SidebarBrand, SidebarFooterNav, SidebarNav } from "./sidebar-nav";
import { SidebarUser } from "./sidebar-user";
import { Topbar } from "./topbar";

function SidebarContents({ user, onNavigate }: { user: SessionUser; onNavigate?: () => void }) {
  return (
    <>
      <SidebarBrand onNavigate={onNavigate} />
      <SidebarNav onNavigate={onNavigate} />
      <div className="mt-auto flex flex-col gap-0.5 border-t border-sidebar-border pt-3">
        <SidebarFooterNav onNavigate={onNavigate} />
        <SidebarUser user={user} />
      </div>
    </>
  );
}

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
    <div className="flex h-dvh overflow-hidden bg-background print:block print:h-auto print:overflow-visible">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>

      <aside className="scroll-thin hidden w-60 shrink-0 flex-col gap-5 overflow-y-auto border-r border-sidebar-border bg-sidebar px-3 pb-2.5 lg:flex print:hidden">
        <SidebarContents user={user} />
      </aside>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="flex w-[264px] flex-col gap-5 overflow-y-auto bg-sidebar px-3 pt-0 pb-2.5 data-[side=left]:w-[264px] data-[side=left]:sm:max-w-[264px]" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Main navigation for the dashboard.</SheetDescription>
          <SidebarContents user={user} onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex h-full min-w-0 flex-1 flex-col print:block print:h-auto">
        <Topbar today={today} notifications={notifications} onOpenMenu={() => setMenuOpen(true)} />
        <main id="main" className="scroll-thin relative min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-7 print:overflow-visible print:p-0">
          <SectionTabs />
          {children}
        </main>
      </div>
    </div>
  );
}
