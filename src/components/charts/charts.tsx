"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompact, formatNumber } from "@/lib/format";
import { niceTicks } from "./ticks";

/** Categorical slot, 1 to 8. Keep a series on one slot across every chart. */
export type SeriesSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface ChartSeries {
  key: string;
  label: string;
  slot: SeriesSlot;
}

export type ChartDatum = { label: string } & Record<string, string | number>;

type ValueFormatter = (value: number) => string;

const seriesColor = (slot: SeriesSlot) => `var(--series-${slot})`;
const AXIS_TICK = { fill: "var(--chart-ink)", fontSize: 12 };

export function ChartLegend({ series }: { series: ChartSeries[] }) {
  // A single series needs no legend: the card title already names it.
  if (series.length < 2) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1">
      {series.map((entry) => (
        <li key={entry.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: seriesColor(entry.slot) }} aria-hidden />
          {entry.label}
        </li>
      ))}
    </ul>
  );
}

function ChartTooltip({
  active,
  label,
  series,
  payload,
  format,
}: {
  active?: boolean;
  label?: string | number;
  series: ChartSeries[];
  payload?: readonly { dataKey?: unknown; value?: unknown }[];
  format: ValueFormatter;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-32 rounded-md border border-border bg-popover px-2.5 py-2 text-xs shadow-sm">
      <p className="mb-1 font-medium">{label}</p>
      <ul className="flex flex-col gap-0.5">
        {series.map((entry) => {
          const value = payload.find((item) => item.dataKey === entry.key)?.value;
          return (
            <li key={entry.key} className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm" style={{ backgroundColor: seriesColor(entry.slot) }} aria-hidden />
              <span className="text-muted-foreground">{entry.label}</span>
              <span className="ml-auto pl-3 font-medium tabular-nums">
                {typeof value === "number" ? format(value) : "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function compactAxis(value: number): string {
  return Math.abs(value) >= 10000 ? formatCompact(value) : formatNumber(value);
}

function largestValue(data: ChartDatum[], series: ChartSeries[], stacked: boolean): number {
  const values = data.map((row) => {
    const rowValues = series.map((entry) => Number(row[entry.key] ?? 0));
    return stacked ? rowValues.reduce((sum, value) => sum + value, 0) : Math.max(...rowValues);
  });
  return Math.max(0, ...values);
}

function ChartFrame({
  data,
  series,
  format,
  axisFormat,
  height,
  domain,
  reversed,
  stacked = false,
  children,
}: {
  data: ChartDatum[];
  series: ChartSeries[];
  stacked?: boolean;
  format: ValueFormatter;
  axisFormat: ValueFormatter;
  height: number;
  domain?: [number | "auto", number | "auto"];
  reversed?: boolean;
  children: React.ReactNode;
}) {
  // A chart with an explicit domain, such as average position, sets its own scale.
  const ticks = domain ? undefined : niceTicks(largestValue(data, series, stacked));

  return (
    <div className="flex flex-col gap-2">
      <ChartLegend series={series} />
      {/* Fixed height prevents layout shift while the chart measures itself. */}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }} barGap={2}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="label"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: "var(--chart-axis)" }}
              interval="preserveStartEnd"
              minTickGap={12}
            />
            <YAxis
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={axisFormat}
              domain={domain ?? [0, ticks?.at(-1) ?? "auto"]}
              ticks={ticks}
              reversed={reversed}
            />
            <Tooltip
              cursor={{ stroke: "var(--chart-axis)", fill: "var(--muted)", fillOpacity: 0.6 }}
              content={(props) => (
                <ChartTooltip
                  active={props.active}
                  label={props.label as string | number | undefined}
                  payload={props.payload as readonly { dataKey?: unknown; value?: unknown }[]}
                  series={series}
                  format={format}
                />
              )}
            />
            {children}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Vertical bars. `stacked` shows parts of a whole. */
export function BarTrendChart({
  data,
  series,
  stacked = false,
  format = formatNumber,
  axisFormat = compactAxis,
  height = 240,
}: {
  data: ChartDatum[];
  series: ChartSeries[];
  stacked?: boolean;
  format?: ValueFormatter;
  axisFormat?: ValueFormatter;
  height?: number;
}) {
  return (
    <ChartFrame data={data} series={series} stacked={stacked} format={format} axisFormat={axisFormat} height={height}>
      {series.map((entry, index) => (
        <Bar
          key={entry.key}
          dataKey={entry.key}
          stackId={stacked ? "stack" : undefined}
          fill={seriesColor(entry.slot)}
          maxBarSize={24}
          // Only the top of a stack is rounded. Segments are split by a surface gap.
          radius={!stacked || index === series.length - 1 ? [4, 4, 0, 0] : 0}
          stroke={stacked ? "var(--card)" : undefined}
          strokeWidth={stacked ? 1 : 0}
          isAnimationActive={false}
        />
      ))}
    </ChartFrame>
  );
}

/** Change over time. `area` adds a light wash under a single series. */
export function LineTrendChart({
  data,
  series,
  area = false,
  format = formatNumber,
  axisFormat = compactAxis,
  height = 240,
  domain,
  reversed,
}: {
  data: ChartDatum[];
  series: ChartSeries[];
  area?: boolean;
  format?: ValueFormatter;
  axisFormat?: ValueFormatter;
  height?: number;
  domain?: [number | "auto", number | "auto"];
  /** For metrics where lower is better, such as average position. */
  reversed?: boolean;
}) {
  return (
    <ChartFrame
      data={data}
      series={series}
      format={format}
      axisFormat={axisFormat}
      height={height}
      domain={domain}
      reversed={reversed}
    >
      {series.map((entry) =>
        area ? (
          <Area
            key={entry.key}
            type="monotone"
            dataKey={entry.key}
            stroke={seriesColor(entry.slot)}
            strokeWidth={2}
            fill={seriesColor(entry.slot)}
            fillOpacity={0.1}
            dot={false}
            activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        ) : (
          <Line
            key={entry.key}
            type="monotone"
            dataKey={entry.key}
            stroke={seriesColor(entry.slot)}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        ),
      )}
    </ChartFrame>
  );
}
