import "server-only";
import { addDays } from "@/lib/date-range";
import type { ISODate, Lead } from "@/lib/types";
import { requireSessionUser } from "@/server/auth/session";
import { createDb, releaseDb } from "@/server/db/client";
import { LEAD_INCLUDE, toLead } from "@/server/leads/to-lead";

/** All leads, newest first; leads without a date last. Requires a signed-in user. */
export async function getLeads(): Promise<Lead[]> {
  await requireSessionUser();
  const db = createDb();
  try {
    const rows = await db.lead.findMany({
      include: LEAD_INCLUDE,
      orderBy: [{ submittedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    });
    return rows.map(toLead);
  } finally {
    await releaseDb(db);
  }
}

export async function getLead(id: string): Promise<Lead | null> {
  await requireSessionUser();
  const db = createDb();
  try {
    const row = await db.lead.findUnique({ where: { id }, include: LEAD_INCLUDE });
    return row ? toLead(row) : null;
  } finally {
    await releaseDb(db);
  }
}

/**
 * Leads submitted in the last `days` days, without their notes and history:
 * all the notification bell needs, so it does not load every lead on every page.
 */
export async function getRecentLeads(today: ISODate, days: number): Promise<Lead[]> {
  await requireSessionUser();
  const db = createDb();
  try {
    const rows = await db.lead.findMany({
      // One extra day of margin: the feed applies the exact window itself.
      where: { submittedAt: { gte: new Date(`${addDays(today, -days)}T00:00:00.000Z`) } },
      include: { payments: LEAD_INCLUDE.payments },
      orderBy: [{ submittedAt: "desc" }],
    });
    return rows.map(toLead);
  } finally {
    await releaseDb(db);
  }
}
