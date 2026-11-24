"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatMonth } from "@/lib/format";
import type { MonthKey } from "@/lib/types";
import { cn } from "@/lib/utils";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const yearOf = (month: MonthKey) => Number(month.slice(0, 4));
const keyOf = (year: number, index: number): MonthKey => `${year}-${String(index + 1).padStart(2, "0")}`;

/**
 * A month calendar in a popover: pick a year, then one of its twelve months.
 * Only `available` months can be chosen (for reports, the months that have
 * one); the rest are shown but disabled, so the calendar keeps its shape.
 */
export function MonthPicker({
  value,
  available,
  onChange,
  labelledBy,
  className,
}: {
  value: MonthKey;
  /** The months that can be picked, in any order. */
  available: readonly MonthKey[];
  onChange: (month: MonthKey) => void;
  /** Id of the visible label, so the trigger is announced as e.g. "Period, October 2026". */
  labelledBy?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => (value ? yearOf(value) : new Date().getFullYear()));
  const allowed = new Set(available);
  const years = available.map(yearOf);
  const minYear = years.length ? Math.min(...years) : year;
  const maxYear = years.length ? Math.max(...years) : year;

  function openChange(next: boolean) {
    // Each opening starts on the selected month's year.
    if (next && value) setYear(yearOf(value));
    setOpen(next);
  }

  return (
    <Popover open={open} onOpenChange={openChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-labelledby={labelledBy ? `${labelledBy} month-picker-value` : undefined}
          className={cn("h-10 w-full max-w-[280px] justify-between gap-2 px-3 text-sm font-medium text-ink", className)}
        >
          <span className="flex min-w-0 items-center gap-2">
            <CalendarDays className="size-4 shrink-0 text-ink-quiet" aria-hidden />
            <span id="month-picker-value" className="truncate">
              {value ? formatMonth(value) : "Choose a month"}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-ink-quiet" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[280px] p-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setYear((current) => current - 1)}
            disabled={year <= minYear}
            aria-label="Previous year"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <span className="text-[13px] font-semibold text-ink tabular-nums" aria-live="polite">
            {year}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setYear((current) => current + 1)}
            disabled={year >= maxYear}
            aria-label="Next year"
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
        <div role="group" aria-label={`Months of ${year}`} className="mt-2 grid grid-cols-3 gap-1.5">
          {MONTH_NAMES.map((name, index) => {
            const month = keyOf(year, index);
            const selected = month === value;
            const enabled = allowed.has(month);
            return (
              <button
                key={month}
                type="button"
                disabled={!enabled}
                aria-pressed={selected}
                aria-label={formatMonth(month)}
                onClick={() => {
                  onChange(month);
                  setOpen(false);
                }}
                className={cn(
                  "h-9 rounded-lg text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                    : enabled
                      ? "text-ink hover:bg-muted"
                      : "cursor-not-allowed text-[#c4c9d1]",
                )}
              >
                {name}
              </button>
            );
          })}
        </div>
        <p className="mt-2.5 border-t border-border pt-2.5 text-xs text-ink-quiet">
          Reports cover complete months. Greyed-out months have no report.
        </p>
      </PopoverContent>
    </Popover>
  );
}
