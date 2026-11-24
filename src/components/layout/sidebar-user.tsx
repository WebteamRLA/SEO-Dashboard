"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";
import { getInitials } from "@/lib/format";
import type { Role, SessionUser } from "@/lib/types";

const ROLE_LABEL: Record<Role, string> = { admin: "Admin", manager: "Manager", member: "Member" };

/**
 * The signed-in Google account, pinned to the bottom of the sidebar, with a
 * log out button. Personal settings live under Settings, just above.
 */
export function SidebarUser({ user }: { user: SessionUser }) {
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
    <div className="mt-1 flex min-h-11 items-center gap-2.5 rounded-lg px-2 py-1.5">
      <Avatar className="size-8 shrink-0 border border-input bg-card">
        {user.image ? <AvatarImage src={user.image} alt="" referrerPolicy="no-referrer" /> : null}
        <AvatarFallback className="bg-card text-xs font-semibold text-ink-body">{getInitials(user.name)}</AvatarFallback>
      </Avatar>
      <span className="flex min-w-0 flex-1 flex-col leading-[1.3]">
        <span className="truncate text-sm font-semibold text-ink">{user.name}</span>
        <span className="truncate text-xs text-ink-quiet">{ROLE_LABEL[user.role]} · {user.email}</span>
      </span>
      <button
        type="button"
        onClick={() => void signOut()}
        disabled={signingOut}
        aria-label="Log out"
        title="Log out"
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-quiet outline-none transition-colors hover:bg-sidebar-accent hover:text-ink focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      >
        {signingOut ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <LogOut className="size-4" aria-hidden />}
      </button>
    </div>
  );
}
