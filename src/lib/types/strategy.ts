import type { ISODate } from "./common";

/** One SEO strategy from the RLA strategy sheet (see prisma model Strategy). */
export interface Strategy {
  id: string;
  sortOrder: number;
  /** "Primary" or "Secondary". */
  priority: string;
  goalType: string;
  initiative: string;
  action: string | null;
  startDate: ISODate | null;
  endDate: ISODate | null;
  nextReview: ISODate | null;
  duration: string | null;
  /** The monthly goal as written, e.g. "15 leads/month". */
  kpiTarget: string | null;
  kpiCurrent: string | null;
  owner: string | null;
  /** Work done, 0-100. */
  workProgress: number | null;
  status: string;
  workCompleted: string | null;
  evidenceUrl: string | null;
  nextSteps: string | null;
  outcome: string | null;
  expectedImpact: string | null;
  timeToImpact: string | null;
  taskUrl: string | null;
  updatedAt: string;
}
