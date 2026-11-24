"use client";

import { usePathname } from "next/navigation";
import { PeriodLink } from "@/components/layout/period-link";
import { Suspense, use, useState, useTransition, type ComponentProps } from "react";
import { Bell, ChevronRight, CircleAlert, CircleCheck, Menu, UserPlus, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
  if (!active) return <span className="truncate text-[13px] font-medium text-ink">Dashboard</span>;

  const { group, item } = active;
  const isDetail = pathname !== item.href;
  // A section's landing page, and any page of a tabbed section, goes by the
  // section name (the tab bar names the page). Other pages show "Section › Page".
  const isLanding = group.tabs || item.href === group.items[0]?.href;
  const pageLabel = isLanding ? group.label : item.label;
  const showGroup = !isLanding;

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
      {showGroup ? (
        <>
          <span className="hidden truncate text-ink-quiet sm:inline">{group.label}</span>
          <ChevronRight className="hidden size-3.5 shrink-0 text-ink-quiet sm:inline" aria-hidden />
        </>
      ) : null}
      {isDetail ? (
        <>
          <PeriodLink href={item.href} className="truncate text-ink-quiet hover:text-ink">
            {pageLabel}
          </PeriodLink>
          <ChevronRight className="size-3.5 shrink-0 text-ink-quiet" aria-hidden />
          <span className="truncate font-medium text-ink" aria-current="page">Details</span>
        </>
      ) : (
        <span className="truncate font-medium text-ink" aria-current="page">{pageLabel}</span>
      )}
    </nav>
  );
}

const KIND_ICON: Record<NotificationKind, LucideIcon> = {
  lead: UserPlus,
  "task-completed": CircleCheck,
  "task-overdue": CircleAlert,
};

/** Tinted icon squares, as in the design: blue for leads, green for done, amber for attention. */
const KIND_TONE: Record<NotificationKind, string> = {
  lead: "bg-tone-info-bg text-tone-info-fg",
  "task-completed": "bg-tone-good-bg text-tone-good-fg",
  "task-overdue": "bg-tone-warning-bg text-tone-warning-fg",
};

function BellButton({ unread, ...props }: { unread: number } & ComponentProps<typeof Button>) {
  return (
    <Button
      variant="outline"
      size="icon-lg"
      className="relative text-ink-body"
      aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      {...props}
    >
      <Bell className="size-[18px]" aria-hidden />
      {unread ? (
        <span
          className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-bold text-primary-foreground ring-2 ring-card"
          aria-hidden
        >
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Button>
  );
}

function Notifications({ feed }: { feed: Promise<AppNotification[]> }) {
  const notifications = use(feed);
  // Opening the menu marks everything read here at once; the cookie the action
  // sets keeps it read on the next load. Items that were unread when it opened
  // keep their dot while it stays open, so people can see what is new.
  const [openedAt, setOpenedAt] = useState<number | null>(null);
  const [newIds, setNewIds] = useState<ReadonlySet<string>>(new Set());
  const [, startTransition] = useTransition();
  const isRead = (notification: AppNotification) =>
    notification.read || (openedAt !== null && Date.parse(notification.createdAt) <= openedAt);
  const unread = notifications.filter((notification) => !isRead(notification)).length;

  function onOpenChange(open: boolean) {
    if (!open) {
      if (newIds.size > 0) setNewIds(new Set());
      return;
    }
    if (unread === 0) return;
    setNewIds(new Set(notifications.filter((notification) => !isRead(notification)).map((notification) => notification.id)));
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
      <DropdownMenuContent align="end" sideOffset={8} className="w-[380px] max-w-[calc(100vw-1rem)] overflow-hidden p-0">
        <DropdownMenuLabel className="flex h-[52px] items-center border-b border-border px-4 text-[15px] font-semibold text-ink">
          Notifications
        </DropdownMenuLabel>
        <div className="scroll-thin max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-ink-quiet">
              Nothing new. New leads and SEO task updates show up here.
            </p>
          ) : (
            notifications.map((notification, index) => {
              const Icon = KIND_ICON[notification.kind];
              const isNew = !isRead(notification) || newIds.has(notification.id);
              return (
                <DropdownMenuItem
                  key={notification.id}
                  asChild
                  className={cn(
                    "rounded-none px-4 py-3 focus:bg-[#f9fafb]",
                    index > 0 && "border-t border-line-soft",
                  )}
                >
                  <PeriodLink href={notification.href} className="flex items-start gap-3">
                    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", KIND_TONE[notification.kind])}>
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className={cn("text-[13px] text-ink", isNew ? "font-semibold" : "font-medium")}>
                        {notification.title}
                        {isNew ? <span className="sr-only"> (new)</span> : null}
                      </span>
                      {notification.description ? (
                        <span className="line-clamp-2 text-xs leading-[1.45] text-ink-quiet">{notification.description}</span>
                      ) : null}
                      <span className="text-[11px] text-[#6b7280]">{formatDate(notification.createdAt)}</span>
                    </span>
                    {isNew ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden /> : null}
                  </PeriodLink>
                </DropdownMenuItem>
              );
            })
          )}
        </div>
        <DropdownMenuItem asChild className="rounded-none border-t border-border p-0 focus:bg-muted">
          <PeriodLink href="/settings/notifications" className="flex h-11 items-center justify-center text-[13px] font-medium text-ink-body">
            Notification settings
          </PeriodLink>
        </DropdownMenuItem>
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
    <header className="sticky top-0 z-30 flex min-h-16 shrink-0 items-center gap-2.5 border-b border-border bg-card px-4 py-3 sm:px-6 lg:px-8 print:hidden">
      <Button variant="outline" size="icon-lg" className="lg:hidden" onClick={onOpenMenu} aria-label="Open navigation menu">
        <Menu className="size-[18px]" aria-hidden />
      </Button>
      <div className="min-w-0 flex-1">
        <Breadcrumb />
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <Suspense fallback={<BellButton unread={0} disabled />}>
          <Notifications feed={notifications} />
        </Suspense>
        {periodScoped ? <DateRangeFilter today={today} /> : null}
      </div>
    </header>
  );
}
