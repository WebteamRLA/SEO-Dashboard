import type { ISODate, ISODateTime, MonthKey } from "@/lib/types";

/**
 * All formatters pin the locale and time zone. Server and client must produce
 * identical strings, otherwise React reports a hydration mismatch.
 *
 * A calendar date ("2026-10-05") has no time zone and is shown as written, so
 * it is formatted in UTC, where `new Date("2026-10-05")` lands. A timestamp
 * (a form submission) is an instant, shown in RLA's reporting time zone.
 */
const LOCALE = "en-US";
const TIME_ZONE = "UTC";

/**
 * RLA's reporting time zone. Assumed New York, the same zone the leads sheet is
 * imported in, until RLA confirms it. Change it here and in the import default.
 */
export const REPORTING_TIME_ZONE = "America/New_York";

/** Whether a value is a plain calendar date rather than a timestamp. */
export function isCalendarDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Single place to change the reporting currency once RLA confirms it. */
export const CURRENCY = "USD";

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: TIME_ZONE,
});

const instantDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: REPORTING_TIME_ZONE,
});

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: REPORTING_TIME_ZONE,
});

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: REPORTING_TIME_ZONE,
});

/** The reporting-zone `YYYY-MM-DD` of a timestamp. */
export function instantDay(value: ISODateTime): ISODate {
  return dayKeyFormatter.format(new Date(value));
}

/** The reporting-zone `YYYY-MM` of a timestamp. */
export function instantMonthKey(value: ISODateTime): MonthKey {
  return instantDay(value).slice(0, 7);
}

const monthFormatter = new Intl.DateTimeFormat(LOCALE, {
  year: "numeric",
  month: "long",
  timeZone: TIME_ZONE,
});

const shortMonthFormatter = new Intl.DateTimeFormat(LOCALE, {
  month: "short",
  timeZone: TIME_ZONE,
});

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  maximumFractionDigits: 0,
});

const compactFormatter = new Intl.NumberFormat(LOCALE, {
  notation: "compact",
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat(LOCALE);

export function formatDate(value: ISODate | ISODateTime | null): string {
  if (!value) return "—";
  return (isCalendarDate(value) ? dateFormatter : instantDateFormatter).format(new Date(value));
}

export function formatDateTime(value: ISODateTime | null): string {
  return value ? dateTimeFormatter.format(new Date(value)) : "—";
}

/** `2026-10` becomes `October 2026`. */
export function formatMonth(month: MonthKey): string {
  return monthFormatter.format(new Date(`${month}-01T00:00:00Z`));
}

/** `2026-10` becomes `Oct`. */
export function formatMonthShort(month: MonthKey): string {
  return shortMonthFormatter.format(new Date(`${month}-01T00:00:00Z`));
}

export function formatCurrency(value: number | null): string {
  return value === null ? "—" : currencyFormatter.format(value);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** `12900` becomes `12.9K`. Use for standalone figures, not table columns. */
export function formatCompact(value: number): string {
  return compactFormatter.format(value);
}

export function formatPercent(value: number, fractionDigits = 0): string {
  return `${value.toFixed(fractionDigits)}%`;
}

/** Initials for an avatar: `Maya Okafor` becomes `MO`. */
export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
