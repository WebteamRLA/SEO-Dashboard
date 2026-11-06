"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const ALL = "all";

export interface FilterOption {
  value: string;
  label: string;
}

/**
 * A dropdown filter. The first entry is always "All ...", with value `ALL`, as
 * Radix Select does not allow an empty value.
 */
export function FilterSelect({
  label,
  allLabel,
  value,
  options,
  onChange,
  className,
}: {
  /** Accessible name, e.g. "Filter by status". */
  label: string;
  allLabel: string;
  value: string;
  options: readonly FilterOption[];
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className={cn("w-full bg-card sm:w-44", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Row above a table holding search and filters. */
export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col flex-wrap gap-2 sm:flex-row sm:items-center">{children}</div>;
}
