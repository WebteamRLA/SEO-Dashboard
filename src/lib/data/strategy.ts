import "server-only";
import { requireSessionUser } from "@/server/auth/session";
import { createDb, releaseDb } from "@/server/db/client";
import type { Strategy } from "@/lib/types";

/** A Postgres DATE arrives as UTC midnight; keep just the calendar date. */
const day = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : null);

/** The SEO strategies imported from the RLA strategy sheet, in sheet order. */
export async function getStrategies(): Promise<Strategy[]> {
  await requireSessionUser();
  const db = createDb();
  try {
    const rows = await db.strategy.findMany({ orderBy: { sortOrder: "asc" } });
    return rows.map((row) => ({
      id: row.id,
      sortOrder: row.sortOrder,
      priority: row.priority,
      goalType: row.goalType,
      initiative: row.initiative,
      action: row.action,
      startDate: day(row.startDate),
      endDate: day(row.endDate),
      nextReview: day(row.nextReview),
      duration: row.duration,
      kpiTarget: row.kpiTarget,
      kpiCurrent: row.kpiCurrent,
      owner: row.owner,
      workProgress: row.workProgress,
      status: row.status,
      workCompleted: row.workCompleted,
      evidenceUrl: row.evidenceUrl,
      nextSteps: row.nextSteps,
      outcome: row.outcome,
      expectedImpact: row.expectedImpact,
      timeToImpact: row.timeToImpact,
      taskUrl: row.taskUrl,
      updatedAt: row.updatedAt.toISOString(),
    }));
  } finally {
    await releaseDb(db);
  }
}
