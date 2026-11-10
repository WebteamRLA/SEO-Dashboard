"use client";

import { PeriodLink } from "@/components/layout/period-link";
import { usePathname } from "next/navigation";
import { Bell, ChevronRight, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { findActiveNav } from "@/config/navigation";
import { formatDate } from "@/lib/format";
import type { AppNotification, ISODate } from "@/lib/types";
import { DateRangeFilter } from "./date-range-filter";

function Breadcrumb() {
  const pathname = usePathname();
  const active = findActiveNav(pathname);
  if (!active) return <span className="truncate text-sm font-medium">Dashboard</span>;

  const { group, item } = active;
  const isDetail = pathname !== item.href;
  const showGroup = group.items.length > 1;

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
      {showGroup ? (
        <>
          <span className="hidden truncate text-muted-foreground sm:inline">{group.label}</span>
          <ChevronRight className="hidden size-3.5 shrink-0 text-muted-foreground sm:inline" aria-hidden />
        </>
      ) : null}
      {isDetail ? (
        <>
          <PeriodLink
            href={item.href}
            className="truncate text-muted-foreground hover:text-foreground"
          >
            {item.label}
          </PeriodLink>
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate font-medium" aria-current="page">Details</span>
        </>
      ) : (
        <span className="truncate font-medium" aria-current="page">{item.label}</span>
      )}
    </nav>
  );
}

function Notifications({ notifications }: { notifications: AppNotification[] }) {
  const unread = notifications.filter((notification) => !notification.read).length;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        >
          <Bell className="size-4" aria-hidden />
          {unread ? (
            <span className="absolute top-1 right-1 size-2 rounded-full bg-status-critical ring-2 ring-card" aria-hidden />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.map((notification) => (
          <DropdownMenuItem key={notification.id} asChild>
            <PeriodLink href={notification.href} className="flex flex-col items-start gap-0.5">
              <span className="flex w-full items-center gap-2 font-medium">
                {notification.title}
                {notification.read ? null : <span className="sr-only">Unread</span>}
              </span>
              <span className="text-xs text-muted-foreground">{notification.description}</span>
              <span className="text-xs text-muted-foreground">{formatDate(notification.createdAt)}</span>
            </PeriodLink>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Topbar({
  today,
  notifications,
  onOpenMenu,
}: {
  today: ISODate;
  notifications: AppNotification[];
  onOpenMenu: () => void;
}) {
  const pathname = usePathname();
  const active = findActiveNav(pathname);
  const periodScoped = active?.item.periodScoped === true && active.item.href === pathname;

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:px-5">
      <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={onOpenMenu} aria-label="Open navigation menu">
        <Menu className="size-5" aria-hidden />
      </Button>
      <div className="min-w-0 flex-1">
        <Breadcrumb />
      </div>
      {periodScoped ? <DateRangeFilter today={today} /> : null}
      <Notifications notifications={notifications} />
    </header>
  );
}
