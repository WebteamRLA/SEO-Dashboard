import { isWithin, type DateRange } from "@/lib/date-range";
import { periodBuckets, type BucketUnit } from "@/lib/period-buckets";
import type { ISODate } from "@/lib/types";

export interface VisitsColumn {
  label: string;
  visits: number;
  searchAndAi: number;
  /** The column runs past the last reported day ("so far"). */
  partial: boolean;
}

/**
 * Daily GA4 visits grouped into the same columns as the Overview charts (by
 * day up to a month, by week up to a quarter, by month beyond). Columns stop at
 * `through`, the last complete day of data; days GA4 left out count as zero.
 */
export function visitsTrend(
  days: readonly { date: ISODate; visits: number; searchAndAi: number }[],
  period: DateRange,
  through: ISODate,
): { unit: BucketUnit; columns: VisitsColumn[] } {
  const { unit, buckets } = periodBuckets(period, through, { stopAtToday: true, todayComplete: true });
  const columns = buckets.map((bucket) => {
    const inBucket = days.filter((day) => isWithin(day.date, bucket.range));
    return {
      label: bucket.label,
      visits: inBucket.reduce((sum, day) => sum + day.visits, 0),
      searchAndAi: inBucket.reduce((sum, day) => sum + day.searchAndAi, 0),
      partial: bucket.partial,
    };
  });
  return { unit, columns };
}
