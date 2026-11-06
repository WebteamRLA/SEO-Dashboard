"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";

/** Adds the selected month to an in-app path, so it survives navigation. */
export function useMonthHref() {
  const month = useSearchParams().get("month");
  return (href: string) => (month ? `${href}?month=${encodeURIComponent(month)}` : href);
}

/**
 * An in-app link that keeps the selected month. Use this rather than `Link`
 * for dashboard routes: a single plain link would silently reset the month.
 */
export function MonthLink({ href, ...props }: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const withMonth = useMonthHref();
  return <Link href={withMonth(href)} {...props} />;
}
