import type { DeliveryModule, DeliveryStatus, Phase, Progress, StatusTone } from "@/lib/types";
import { toProgress } from "./progress";

export const DELIVERY_STATUS_META: Record<DeliveryStatus, { label: string; tone: StatusTone }> = {
  "not-started": { label: "Not started", tone: "neutral" },
  "frontend-preview": { label: "Frontend preview", tone: "info" },
  "in-progress": { label: "In progress", tone: "warning" },
  complete: { label: "Complete", tone: "good" },
};

export function moduleProgress(module: DeliveryModule): Progress {
  return toProgress(module.steps.filter((step) => step.done).length, module.steps.length);
}

export function phaseProgress(modules: readonly DeliveryModule[], phase: Phase): Progress {
  const steps = modules.filter((module) => module.phase === phase).flatMap((m) => m.steps);
  return toProgress(steps.filter((step) => step.done).length, steps.length);
}
