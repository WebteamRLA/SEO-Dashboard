"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import type { DateRange as PickerRange } from "react-day-picker";
import { CalendarDays, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  formatRange,
  periodLabel,
  periodParams,
  presetRange,
  RANGE_PRESETS,
  resolvePeriod,
  type Period,
} from "@/lib/date-range";
import type { ISODate } from "@/lib/types";
import { cn } from "@/lib/utils";

// The picker works in local time; the app uses UTC calendar dates. Convert by
// year, month, and day so no timezone moves a date by one.
function toPickerDate(date: ISODate): Date {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

function toIsoDate(date: Date): ISODate {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const PERIOD_KEYS = ["range", "from", "to", "month"] as const;

/**
 * The global reporting period. The URL holds it, so a view can be shared and the
 * server reads it: a preset by name (`?range=this-month`) or custom dates
 * (`?from=&to=`). `today` comes from the server so both sides agree.
 */
export function DateRangeFilter({ today }: { today: ISODate }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PickerRange | undefined>();
  const [months, setMonths] = useState(1);
  const [isPending, startTransition] = useTransition();

  const period = resolvePeriod(
    Object.fromEntries(PERIOD_KEYS.map((key) => [key, searchParams.get(key) ?? undefined])),
    today,
  );

  function openChange(next: boolean) {
    if (next) {
      setDraft({ from: toPickerDate(period.range.from), to: toPickerDate(period.range.to) });
      // Two months side by side only where they fit.
      setMonths(window.matchMedia("(min-width: 640px)").matches ? 2 : 1);
    }
    setOpen(next);
  }

  function apply(next: Period) {
    const params = new URLSearchParams(searchParams);
    for (const key of PERIOD_KEYS) params.delete(key);
    for (const [key, value] of Object.entries(periodParams(next))) params.set(key, value);
    setOpen(false);
    startTransition(() => router.replace(`${pathname}?${params}`, { scroll: false }));
  }

  const draftComplete = Boolean(draft?.from && draft?.to);

  return (
    <Popover open={open} onOpenChange={openChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-busy={isPending}
          aria-label={`Reporting period: ${periodLabel(period)}, ${formatRange(period.range)}`}
          className="max-w-[60vw] gap-1.5 bg-card"
        >
          <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
          <span className="truncate font-medium">{periodLabel(period)}</span>
          {period.preset === "custom" ? null : (
            <span className="hidden text-muted-foreground lg:inline">· {formatRange(period.range)}</span>
          )}
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto max-w-[calc(100vw-1rem)] p-0">
        <div className="flex flex-col sm:flex-row">
          <ul aria-label="Preset periods" className="flex flex-col gap-0.5 border-b border-border p-2 sm:w-44 sm:border-r sm:border-b-0">
            {RANGE_PRESETS.map((preset) => {
              const active = period.preset === preset.id;
              return (
                <li key={preset.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => apply({ preset: preset.id, range: presetRange(preset.id, today) })}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                      active && "bg-accent font-medium text-accent-foreground hover:bg-accent",
                    )}
                  >
                    {preset.label}
                    {active ? <Check className="size-4" aria-hidden /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-col p-2">
            <p className="px-2 pt-1 text-xs font-medium text-muted-foreground">Custom range</p>
            <Calendar
              mode="range"
              numberOfMonths={months}
              defaultMonth={draft?.from}
              selected={draft}
              onSelect={setDraft}
              resetOnSelect
            />
            <div className="flex items-center justify-between gap-3 border-t border-border px-2 pt-2">
              <span className="text-xs text-muted-foreground" aria-live="polite">
                {draft?.from && draft.to
                  ? formatRange({ from: toIsoDate(draft.from), to: toIsoDate(draft.to) })
                  : "Pick a start and an end date"}
              </span>
              <Button
                size="sm"
                disabled={!draftComplete}
                onClick={() =>
                  draft?.from &&
                  draft.to &&
                  apply({ preset: "custom", range: { from: toIsoDate(draft.from), to: toIsoDate(draft.to) } })
                }
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
