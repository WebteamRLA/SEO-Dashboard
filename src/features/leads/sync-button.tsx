"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { syncLeadsFromTeamwork } from "@/server/leads/sync";
import { cn } from "@/lib/utils";
import { useLeads } from "./leads-store";

/** "just now", "4 min ago", "2 h ago": how fresh the copy from Teamwork is. */
function ago(iso: string, now: number): string {
  const minutes = Math.floor((now - Date.parse(iso)) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.floor(hours / 24)} d ago`;
}

/** A clock that ticks every 30 seconds, for "Synced 4 min ago". Null while rendering on the server. */
const TICK_MS = 30_000;
function subscribeToClock(onTick: () => void) {
  const timer = setInterval(onTick, TICK_MS);
  return () => clearInterval(timer);
}
const clockNow = () => Math.floor(Date.now() / TICK_MS) * TICK_MS;
const noClock = () => null;

/**
 * Pulls the latest Pipeline board from Teamwork, then re-renders the page with
 * it. Pages already refresh from Teamwork on their own every minute or so;
 * this is for "I just moved a card, show me now".
 */
export function SyncButton({ className }: { className?: string }) {
  const router = useRouter();
  const { syncedAt } = useLeads();
  const [pending, startTransition] = useTransition();
  const now = useSyncExternalStore(subscribeToClock, clockNow, noClock);

  function sync() {
    startTransition(async () => {
      const result = await syncLeadsFromTeamwork();
      if (!result.ok) {
        toast.error(`Could not sync with Teamwork. ${result.error}`);
        return;
      }
      router.refresh();
      toast.success(`Synced ${result.cards} leads from Teamwork`);
    });
  }

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="hidden text-xs text-ink-quiet sm:inline" aria-live="polite">
        {pending ? "Syncing with Teamwork…" : syncedAt && now !== null ? `Synced ${ago(syncedAt, now)}` : null}
      </span>
      <Button variant="outline" size="sm" onClick={sync} disabled={pending}>
        <RefreshCw className={cn("size-3.5", pending && "animate-spin")} aria-hidden />
        Sync from Teamwork
      </Button>
    </div>
  );
}
