import { addDays, rangeDays, type DateRange } from "@/lib/date-range";
import { formatDayShort, formatMonthShort } from "@/lib/format";
import type { ISODate } from "@/lib/types";

/**
 * Splits a reporting period into chart columns, so "over time" charts follow
 * the selected period instead of a fixed list of months.
 */

export type BucketUnit = "day" | "week" | "month";

export interface PeriodBucket {
  /** The days this column covers, both ends included, clipped to the period. */
  range: DateRange;
  /** Text under the column, such as "Nov 3", "Nov 1–7" or "Oct". */
  label: string;
  /** The column is still filling: it holds today, or runs past the last complete day. */
  partial: boolean;
}

/** A weekly tail this short or shorter joins the week before it. */
const SHORT_WEEK_TAIL = 3;

/** Up to a month is drawn by day, up to a quarter by week, anything longer by month. */
export function bucketUnit(days: number): BucketUnit {
  if (days <= 31) return "day";
  if (days <= 92) return "week";
  return "month";
}

function lastDayOfMonth(date: ISODate): ISODate {
  const [y, m] = date.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

function weekLabel(from: ISODate, to: ISODate): string {
  if (from === to) return formatDayShort(from);
  // "Nov 1–7" within a month, "Oct 29–Nov 4" across two.
  const end = from.slice(0, 7) === to.slice(0, 7) ? String(Number(to.slice(8))) : formatDayShort(to);
  return `${formatDayShort(from)}–${end}`;
}

/**
 * The columns for a period. With `stopAtToday`, days after today are left out
 * (nothing can have happened on them yet, as with leads); without it the whole
 * period is drawn (open tasks can be due later in it). Weeks run from the
 * period's first day; months are calendar months, the first and last clipped.
 *
 * A column holding `today` is partial, since today is still being counted. With
 * `todayComplete` (data that runs through a finished day, such as yesterday for
 * Google), a column is partial only when it runs on past `today`.
 */
export function periodBuckets(
  period: DateRange,
  today: ISODate,
  { stopAtToday = false, todayComplete = false }: { stopAtToday?: boolean; todayComplete?: boolean } = {},
): { unit: BucketUnit; buckets: PeriodBucket[] } {
  const unit = bucketUnit(rangeDays(period));
  const last = stopAtToday && today < period.to ? today : period.to;
  const buckets: PeriodBucket[] = [];
  // From the whole period, so the leads chart (stopped at today) and the tasks chart label months alike.
  const spansYears = period.from.slice(0, 4) !== period.to.slice(0, 4);

  for (let from = period.from; from <= last; ) {
    let fullEnd = unit === "day" ? from : unit === "week" ? addDays(from, 6) : lastDayOfMonth(from);
    // A quarter is 13 weeks and a day or two: fold that tail into the last week
    // rather than drawing a one-day column that reads as a collapse.
    if (unit === "week" && fullEnd < period.to && addDays(fullEnd, SHORT_WEEK_TAIL) >= period.to) fullEnd = period.to;
    const naturalEnd = fullEnd < period.to ? fullEnd : period.to;
    const to = naturalEnd < last ? naturalEnd : last;
    const label =
      unit === "day"
        ? formatDayShort(from)
        : unit === "week"
          ? weekLabel(from, to)
          : spansYears
            ? `${formatMonthShort(from.slice(0, 7))} ’${from.slice(2, 4)}`
            : formatMonthShort(from.slice(0, 7));
    const partial = from <= today && (todayComplete ? today < naturalEnd : today <= naturalEnd);
    buckets.push({ range: { from, to }, label, partial });
    from = addDays(to, 1);
  }
  return { unit, buckets };
}
