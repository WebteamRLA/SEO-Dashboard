import type { MetricDelta } from "@/components/data/metric-card";
import { NO_PRIOR } from "./trend";

export type DeltaKind = "percent" | "points" | "position";

/** What a tile shows under its figure: a coloured change plus the comparison, or why there is none. */
export interface TileChange {
  delta?: MetricDelta;
  detail?: string;
}

const VS = "vs. previous period";

/**
 * The design's tile change (a coloured arrow and figure) for a current/prior pair.
 * Position is lower-is-better, so a smaller number is an improvement. `hasPrior`
 * false means the source has nothing for the previous period.
 */
export function tileChange(kind: DeltaKind, current: number | null, prior: number | null | undefined, hasPrior = true): TileChange {
  if (!hasPrior) return { detail: NO_PRIOR };
  if (current === null || prior === null || prior === undefined) return {};
  if (kind === "position") {
    const gain = Math.round((prior - current) * 10) / 10;
    if (gain === 0) return { delta: { text: "No change", direction: "flat" }, detail: VS };
    return {
      delta: { text: `${Math.abs(gain).toFixed(1)} ${gain > 0 ? "better" : "worse"}`, direction: gain > 0 ? "up" : "down", good: gain > 0 },
      detail: VS,
    };
  }
  if (kind === "points") {
    const diff = Math.round((current - prior) * 10) / 10;
    if (diff === 0) return { delta: { text: "No change", direction: "flat" }, detail: VS };
    return { delta: { text: `${Math.abs(diff).toFixed(1)} pts`, direction: diff > 0 ? "up" : "down" }, detail: VS };
  }
  if (prior === 0) return {};
  const pct = Math.round(((current - prior) / prior) * 1000) / 10;
  if (pct === 0) return { delta: { text: "No change", direction: "flat" }, detail: VS };
  return { delta: { text: `${Math.abs(pct).toFixed(1)}%`, direction: pct > 0 ? "up" : "down" }, detail: VS };
}
