"use client";

import { PeriodLink } from "@/components/layout/period-link";
import { usePathname } from "next/navigation";
import { Suspense, use, useState, useTransition, type ComponentProps } from "react";
import { Bell, ChevronRight, CircleAlert, CircleCheck, Menu, UserPlus, type LucideIcon } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { AppNotification, ISODate, NotificationKind } from "@/lib/types";
import { markNotificationsSeen } from "@/server/notifications/actions";
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

const KIND_ICON: Record<NotificationKind, LucideIcon> = {
  lead: UserPlus,
  "task-completed": CircleCheck,
  "task-overdue": CircleAlert,
};

const KIND_TONE: Record<NotificationKind, string> = {
  lead: "text-primary",
  "task-completed": "text-status-good",
  "task-overdue": "text-status-critical",
};

function BellButton({ unread, ...props }: { unread: number } & ComponentProps<typeof Button>) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="relative"
      aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      {...props}
    >
      <Bell className="size-4" aria-hidden />
      {unread ? (
        <span className="absolute top-1 right-1 size-2 rounded-full bg-status-critical ring-2 ring-card" aria-hidden />
      ) : null}
    </Button>
  );
}

function Notifications({ feed }: { feed: Promise<AppNotification[]> }) {
  const notifications = use(feed);
  // Opening the menu marks everything read here at once; the cookie the action
  // sets keeps it read on the next load.
  const [openedAt, setOpenedAt] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const isRead = (notification: AppNotification) =>
    notification.read || (openedAt !== null && Date.parse(notification.createdAt) <= openedAt);
  const unread = notifications.filter((notification) => !isRead(notification)).length;

  function onOpenChange(open: boolean) {
    if (!open || unread === 0) return;
    setOpenedAt(Date.now());
    startTransition(async () => {
      try {
        await markNotificationsSeen();
      } catch {
        // Not worth interrupting anyone: the dot just comes back on the next load.
      }
    });
  }

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <BellButton unread={unread} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            Nothing new. New leads and SEO task updates show up here.
          </p>
        ) : (
          notifications.map((notification) => {
            const Icon = KIND_ICON[notification.kind];
            return (
              <DropdownMenuItem key={notification.id} asChild>
                <PeriodLink href={notification.href} className="flex items-start gap-2.5">
                  <Icon className={cn("mt-0.5 size-4 shrink-0", KIND_TONE[notification.kind])} aria-hidden />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-medium">
                      {notification.title}
                      {isRead(notification) ? null : <span className="sr-only"> (unread)</span>}
                    </span>
                    {notification.description ? (
                      <span className="line-clamp-2 text-xs text-muted-foreground">{notification.description}</span>
                    ) : null}
                    <span className="text-xs text-muted-foreground">{formatDate(notification.createdAt)}</span>
                  </span>
                </PeriodLink>
              </DropdownMenuItem>
            );
          })
        )}
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
  notifications: Promise<AppNotification[]>;
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
      <Suspense fallback={<BellButton unread={0} disabled />}>
        <Notifications feed={notifications} />
      </Suspense>
    </header>
  );
}
