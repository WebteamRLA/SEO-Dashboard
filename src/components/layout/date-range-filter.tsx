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

/** Small heading over each half of the popover, aligned with the rows below it. */
const SECTION_LABEL = "px-2 pt-1 pb-1 text-[11px] font-semibold tracking-wide text-ink-quiet uppercase";

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
          aria-busy={isPending}
          aria-label={`Reporting period: ${periodLabel(period)}, ${formatRange(period.range)}`}
          className="h-[38px] max-w-[60vw] gap-2 px-3 text-sm font-normal text-ink"
        >
          <CalendarDays className="size-4 text-ink-quiet" aria-hidden />
          <span className="truncate font-medium">{periodLabel(period)}</span>
          {period.preset === "custom" ? null : (
            <span className="hidden text-ink-quiet lg:inline">· {formatRange(period.range)}</span>
          )}
          <ChevronDown className="size-3.5 text-ink-quiet" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto max-w-[calc(100vw-1rem)] p-0">
        <div className="flex flex-col sm:flex-row">
          <div className="flex flex-col border-b border-border p-2 sm:w-44 sm:border-r sm:border-b-0">
            <p className={SECTION_LABEL}>Presets</p>
            <ul aria-label="Preset periods" className="mt-1 flex flex-col gap-0.5">
              {RANGE_PRESETS.map((preset) => {
                const active = period.preset === preset.id;
                return (
                  <li key={preset.id}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => apply({ preset: preset.id, range: presetRange(preset.id, today) })}
                      className={cn(
                        "flex h-9 w-full items-center justify-between gap-2 rounded-md px-2 text-left text-sm text-ink outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                        active && "bg-accent font-semibold text-ink hover:bg-accent",
                      )}
                    >
                      {preset.label}
                      {active ? <Check className="size-4 text-primary" strokeWidth={2.4} aria-hidden /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="flex flex-col">
            <div className="p-2 pb-0">
              <p className={SECTION_LABEL}>Custom range</p>
              <Calendar
                mode="range"
                numberOfMonths={months}
                defaultMonth={draft?.from}
                selected={draft}
                onSelect={setDraft}
                resetOnSelect
                // The app's reporting day, not the device's, so the dot matches the presets.
                today={toPickerDate(today)}
                // Each month shows only its own days, so a date never appears twice.
                showOutsideDays={false}
                className="px-1 [--cell-size:--spacing(8)]"
                classNames={{
                  // Today gets a dot, so it stays distinct from the range fill.
                  today:
                    "before:pointer-events-none before:absolute before:bottom-1 before:left-1/2 before:z-20 before:size-1 before:-translate-x-1/2 before:rounded-full before:bg-primary has-data-[range-end=true]:before:bg-primary-foreground has-data-[range-start=true]:before:bg-primary-foreground has-data-[selected-single=true]:before:bg-primary-foreground",
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5">
              <span className="text-[13px] font-medium text-ink" aria-live="polite">
                {draft?.from && draft.to ? (
                  formatRange({ from: toIsoDate(draft.from), to: toIsoDate(draft.to) })
                ) : (
                  <span className="font-normal text-ink-quiet">Pick a start and an end date</span>
                )}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
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
        </div>
      </PopoverContent>
    </Popover>
  );
}
