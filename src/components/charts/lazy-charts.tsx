"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { BarTrendChart as BarChartType, LineTrendChart as LineChartType } from "./charts";

/**
 * The recharts-based charts, loaded on demand. recharts is the largest client
 * dependency (about 115 KB gzipped), and most charts in the app are the light
 * ColumnChart, so pages only download it when they actually draw one of these.
 * Charts measure their container, so they render on the client only; the
 * placeholder holds the same height to avoid layout shift.
 */
function ChartPlaceholder() {
  return <div className="w-full flex-1 animate-pulse rounded-lg bg-bar-track" aria-hidden />;
}

const LazyBar = dynamic(() => import("./charts").then((module) => module.BarTrendChart), {
  ssr: false,
  loading: ChartPlaceholder,
});

const LazyLine = dynamic(() => import("./charts").then((module) => module.LineTrendChart), {
  ssr: false,
  loading: ChartPlaceholder,
});

// The wrapper reserves the chart's height, so the placeholder and the chart take the same space.
export function BarTrendChart(props: ComponentProps<typeof BarChartType>) {
  return (
    <div className="flex flex-col" style={{ minHeight: props.height ?? 240 }}>
      <LazyBar {...props} />
    </div>
  );
}

export function LineTrendChart(props: ComponentProps<typeof LineChartType>) {
  return (
    <div className="flex flex-col" style={{ minHeight: props.height ?? 240 }}>
      <LazyLine {...props} />
    </div>
  );
}
