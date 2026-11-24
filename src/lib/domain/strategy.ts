import type { Strategy } from "@/lib/types/strategy";

/**
 * KPI maths for the SEO strategy roadmap. Targets and current values are free
 * text from the strategy sheet ("15 leads/month", "$30K/month", "0.8%",
 * "AI traffic 40-50/month"), so the number is read out of the text.
 */

const NUMBER = String.raw`(\d[\d,]*(?:\.\d+)?)\s*([kKmM])?`;
const KPI_PATTERN = new RegExp(String.raw`\$?\s*${NUMBER}(?:\s*[-–]\s*\$?\s*${NUMBER})?`);

function toNumber(digits: string, suffix: string | undefined): number {
  const value = Number(digits.replace(/,/g, ""));
  if (suffix === "k" || suffix === "K") return value * 1_000;
  if (suffix === "m" || suffix === "M") return value * 1_000_000;
  return value;
}

/**
 * The number in a KPI text, or null when there is none. A range ("40-50")
 * reads as its lower end, the point at which the goal counts as met.
 */
export function parseKpi(text: string | null | undefined): number | null {
  if (!text) return null;
  const match = KPI_PATTERN.exec(text);
  if (!match?.[1]) return null;
  const value = toNumber(match[1], match[2]);
  return Number.isFinite(value) ? value : null;
}

/**
 * How much of the KPI target the current value reaches, in whole percent.
 * Null when either side has no number, or the target is zero. Can exceed 100.
 */
export function goalAchievement(target: string | null | undefined, current: string | null | undefined): number | null {
  const goal = parseKpi(target);
  const now = parseKpi(current);
  if (goal === null || now === null || goal <= 0) return null;
  return Math.round((now / goal) * 100);
}

export interface StrategySummary {
  total: number;
  inProgress: number;
  planned: number;
  completed: number;
  /** Mean goal achievement over strategies with a measurable KPI, each capped at 100. */
  averageAchievement: number | null;
  measured: number;
  /** Mean work progress over strategies that report one. */
  averageWork: number | null;
}

const isStatus = (strategy: Strategy, status: string) => strategy.status.trim().toLowerCase() === status;

const mean = (values: readonly number[]) =>
  values.length === 0 ? null : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

export function summarizeStrategies(strategies: readonly Strategy[]): StrategySummary {
  const achievements = strategies
    .map((strategy) => goalAchievement(strategy.kpiTarget, strategy.kpiCurrent))
    .filter((value): value is number => value !== null)
    .map((value) => Math.min(100, value));
  return {
    total: strategies.length,
    inProgress: strategies.filter((strategy) => isStatus(strategy, "in progress")).length,
    planned: strategies.filter((strategy) => isStatus(strategy, "planned")).length,
    completed: strategies.filter((strategy) => isStatus(strategy, "completed") || isStatus(strategy, "done")).length,
    averageAchievement: mean(achievements),
    measured: achievements.length,
    averageWork: mean(strategies.map((strategy) => strategy.workProgress).filter((value): value is number => value !== null)),
  };
}

/** Strategies grouped by priority (Primary first), then goal type, keeping sheet order within each. */
export function groupStrategies(strategies: readonly Strategy[]): { priority: string; goals: { goalType: string; items: Strategy[] }[] }[] {
  const priorities = new Map<string, Map<string, Strategy[]>>();
  for (const strategy of [...strategies].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const goals = priorities.get(strategy.priority) ?? new Map<string, Strategy[]>();
    goals.set(strategy.goalType, [...(goals.get(strategy.goalType) ?? []), strategy]);
    priorities.set(strategy.priority, goals);
  }
  const rank = (priority: string) => (/^primary$/i.test(priority) ? 0 : /^secondary$/i.test(priority) ? 1 : 2);
  return [...priorities.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([priority, goals]) => ({
      priority,
      goals: [...goals.entries()].map(([goalType, items]) => ({ goalType, items })),
    }));
}

/** "Overdue" when the next review date has passed, so stale strategies stand out. */
export function reviewState(nextReview: string | null, today: string): "overdue" | "due" | null {
  if (!nextReview) return null;
  return nextReview < today ? "overdue" : "due";
}
