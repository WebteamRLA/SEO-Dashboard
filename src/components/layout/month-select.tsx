"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { CalendarDays } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMonth } from "@/lib/format";
import { pickMonth } from "@/lib/month";
import type { MonthKey } from "@/lib/types";

/** The global month filter. The URL is the source of truth, so views can be shared. */
export function MonthSelect({ months, defaultMonth }: { months: MonthKey[]; defaultMonth: MonthKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const month = pickMonth(searchParams.get("month"), months, defaultMonth);

  function selectMonth(next: string) {
    const params = new URLSearchParams(searchParams);
    params.set("month", next);
    startTransition(() => router.replace(`${pathname}?${params}`, { scroll: false }));
  }

  return (
    <Select value={month} onValueChange={selectMonth}>
      <SelectTrigger
        size="sm"
        aria-label="Reporting month"
        aria-busy={isPending}
        className="w-fit bg-card sm:w-44"
      >
        <CalendarDays className="hidden size-4 text-muted-foreground sm:block" aria-hidden />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {[...months].reverse().map((option) => (
          <SelectItem key={option} value={option}>
            {formatMonth(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
