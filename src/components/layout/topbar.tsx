"use client";

import { MonthLink } from "@/components/layout/month-link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bell, ChevronRight, FlaskConical, LogOut, Menu, Settings } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { findActiveNav } from "@/config/navigation";
import { formatDate, getInitials } from "@/lib/format";
import type { AppNotification, MonthKey, TeamMember } from "@/lib/types";
import { MonthSelect } from "./month-select";

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
          <MonthLink
            href={item.href}
            className="truncate text-muted-foreground hover:text-foreground"
          >
            {item.label}
          </MonthLink>
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
            <MonthLink href={notification.href} className="flex flex-col items-start gap-0.5">
              <span className="flex w-full items-center gap-2 font-medium">
                {notification.title}
                {notification.read ? null : <span className="sr-only">Unread</span>}
              </span>
              <span className="text-xs text-muted-foreground">{notification.description}</span>
              <span className="text-xs text-muted-foreground">{formatDate(notification.createdAt)}</span>
            </MonthLink>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu({ user }: { user: TeamMember }) {
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="rounded-full" aria-label={`Account menu for ${user.name}`}>
            <Avatar className="size-7">
              <AvatarFallback className="bg-accent text-xs font-medium text-accent-foreground">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <span className="block truncate text-sm font-medium text-foreground">{user.name}</span>
            <span className="block truncate text-xs font-normal text-muted-foreground">{user.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <MonthLink href="/settings/notifications">
              <Settings className="size-4" aria-hidden />
              User settings
            </MonthLink>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setConfirmingLogout(true)}>
            <LogOut className="size-4" aria-hidden />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmingLogout}
        onOpenChange={setConfirmingLogout}
        title="Log out?"
        description="Sign-in arrives with the backend step, so this preview stays open after you confirm."
        confirmLabel="Log out"
        onConfirm={() => toast.info("Log out is not active in this preview.")}
      />
    </>
  );
}

export function Topbar({
  user,
  months,
  defaultMonth,
  notifications,
  onOpenMenu,
}: {
  user: TeamMember;
  months: MonthKey[];
  defaultMonth: MonthKey;
  notifications: AppNotification[];
  onOpenMenu: () => void;
}) {
  const pathname = usePathname();
  const active = findActiveNav(pathname);
  const monthScoped = active?.item.monthScoped === true && active.item.href === pathname;

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:px-5">
      <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={onOpenMenu} aria-label="Open navigation menu">
        <Menu className="size-5" aria-hidden />
      </Button>
      <div className="min-w-0 flex-1">
        <Breadcrumb />
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            className="hidden items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring md:inline-flex"
          >
            <FlaskConical className="size-3.5" aria-hidden />
            Sample data
          </span>
        </TooltipTrigger>
        <TooltipContent>Everything shown here is sample data, not live RLA figures.</TooltipContent>
      </Tooltip>
      {monthScoped ? <MonthSelect months={months} defaultMonth={defaultMonth} /> : null}
      <Notifications notifications={notifications} />
      <UserMenu user={user} />
    </header>
  );
}
