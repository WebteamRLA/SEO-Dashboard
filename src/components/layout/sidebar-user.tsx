"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronsUpDown, Loader2, LogOut, Settings } from "lucide-react";
import { toast } from "sonner";
import { PeriodLink } from "@/components/layout/period-link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { getInitials } from "@/lib/format";
import type { Role, SessionUser } from "@/lib/types";

const ROLE_LABEL: Record<Role, string> = { admin: "Admin", manager: "Manager", member: "Member" };

/**
 * The signed-in Google account, pinned to the bottom of the sidebar. The menu
 * opens upwards so it stays on screen. `onNavigate` closes the mobile drawer.
 */
export function SidebarUser({ user, onNavigate }: { user: SessionUser; onNavigate?: () => void }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    const { error } = await authClient.signOut();
    if (error) {
      setSigningOut(false);
      toast.error("Couldn't log out. Please try again.");
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="shrink-0 border-t border-sidebar-border p-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-md p-2 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted"
          >
            <Avatar className="size-8 shrink-0">
              {user.image ? <AvatarImage src={user.image} alt="" referrerPolicy="no-referrer" /> : null}
              <AvatarFallback className="bg-accent text-xs font-medium text-accent-foreground">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-sm font-medium">{user.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-56">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Signed in as {ROLE_LABEL[user.role]}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <PeriodLink href="/settings/notifications" onClick={onNavigate}>
              <Settings className="size-4" aria-hidden />
              User settings
            </PeriodLink>
          </DropdownMenuItem>
          <DropdownMenuItem disabled={signingOut} onSelect={() => void signOut()}>
            {signingOut ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <LogOut className="size-4" aria-hidden />}
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
