import type { MonthKey } from "@/lib/types";

/**
 * Fixed "today" for the sample data. Relative filters use this so results do
 * not drift as real time passes. Replaced by the real clock with live data.
 */
export const REFERENCE_DATE = "2026-11-06";

/** The roadmap covers the full strategy year. */
export const STRATEGY_MONTHS: MonthKey[] = Array.from(
  { length: 12 },
  (_, index) => `2026-${String(index + 1).padStart(2, "0")}`,
);

/** Months with activity. The selector offers these. */
export const ACTIVE_MONTHS: MonthKey[] = STRATEGY_MONTHS.slice(0, 11);

/** The latest full month. November is only six days old in the sample data. */
export const DEFAULT_MONTH: MonthKey = "2026-10";
