"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runSiteHealthNow } from "@/server/site-health/actions";

/** How long the page keeps refreshing after a click, in case the checks are not marked running yet. */
const WATCH_MS = 6 * 60_000;
const REFRESH_MS = 15_000;

/**
 * Starts the speed test, site check and indexing check now (admins only). While
 * checks run, the page refreshes itself, so results appear without a reload.
 * The checks start just after the click is answered, so the first refresh may
 * not see them yet: the page keeps refreshing for a few minutes regardless.
 */
export function RunChecksButton({ running }: { running: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [watchUntil, setWatchUntil] = useState(0);
  const [seenRunning, setSeenRunning] = useState(false);
  const watching = watchUntil > 0 && !(seenRunning && !running);
  const busy = running || pending || watching;

  if (running && watchUntil > 0 && !seenRunning) setSeenRunning(true);

  useEffect(() => {
    if (!running && !watching) return;
    const timer = setInterval(() => {
      if (!running && Date.now() > watchUntil) {
        setWatchUntil(0);
        return;
      }
      router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [running, watching, watchUntil, router]);

  function start() {
    setMessage(null);
    startTransition(async () => {
      const result = await runSiteHealthNow();
      if (result.status === "error") {
        setMessage(result.message ?? "Could not start the checks.");
        return;
      }
      setSeenRunning(false);
      setWatchUntil(Date.now() + WATCH_MS);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2.5">
      <span className="hidden text-xs text-ink-quiet sm:inline" aria-live="polite">
        {message ?? (busy ? "Checks running, this takes a few minutes…" : null)}
      </span>
      <Button variant="outline" size="sm" onClick={start} disabled={busy}>
        <RefreshCw className={busy ? "size-3.5 animate-spin" : "size-3.5"} aria-hidden />
        Run checks now
      </Button>
    </div>
  );
}
