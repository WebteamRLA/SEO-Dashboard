import Link from "next/link";
import { Button } from "@/components/ui/button";

/** For URLs outside any route. Pages inside the shell use `(dashboard)/not-found`. */
export default function RootNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-7 bg-surface-subtle px-6 py-10 text-center">
      <div className="flex flex-col items-center gap-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/rla-logo.svg" alt="Right Left Agency" width={166} height={17} className="block h-auto w-[166px]" />
        <span className="pl-5 text-[11px] leading-[1.2] tracking-[0.08em] text-[#556cce] uppercase">Client dashboard</span>
      </div>
      <div className="flex w-full max-w-[400px] flex-col items-center gap-5 rounded-2xl border border-border bg-card p-8 shadow-[0_1px_2px_#1118270a,0_12px_32px_#1118270a]">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl leading-tight font-semibold tracking-tight text-ink">Page not found</h1>
          <p className="text-sm text-ink-quiet">This page does not exist.</p>
        </div>
        <Button asChild size="lg" className="w-full">
          <Link href="/overview">Go to Overview</Link>
        </Button>
      </div>
    </main>
  );
}
