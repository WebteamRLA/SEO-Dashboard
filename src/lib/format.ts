import type { ISODate, ISODateTime, MonthKey } from "@/lib/types";

/**
 * All formatters pin the locale and UTC time zone. Server and client must
 * produce identical strings, otherwise React reports a hydration mismatch.
 */
const LOCALE = "en-US";
const TIME_ZONE = "UTC";

/** Single place to change the reporting currency once RLA confirms it. */
export const CURRENCY = "USD";

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: TIME_ZONE,
});

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

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
  return value ? dateFormatter.format(new Date(value)) : "—";
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
