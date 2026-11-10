"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";

const PERIOD_KEYS = ["range", "from", "to"] as const;

/** Adds the selected reporting period to an in-app path, so it survives navigation. */
export function usePeriodHref() {
  const searchParams = useSearchParams();
  return (href: string) => {
    const params = new URLSearchParams();
    for (const key of PERIOD_KEYS) {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    }
    // Older links carried ?month=. Keep it until a period is chosen again.
    if (params.size === 0) {
      const month = searchParams.get("month");
      if (month) params.set("month", month);
    }
    const query = params.toString();
    return query ? `${href}${href.includes("?") ? "&" : "?"}${query}` : href;
  };
}

/**
 * An in-app link that keeps the selected period. Use this rather than `Link`
 * for dashboard routes: one plain link would silently reset the period.
 */
export function PeriodLink({ href, ...props }: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const withPeriod = usePeriodHref();
  return <Link href={withPeriod(href)} {...props} />;
}
