import "server-only";
import type { Lead } from "@/lib/types";
import { requireSessionUser } from "@/server/auth/session";
import { createDb, releaseDb } from "@/server/db/client";
import { toLead } from "@/server/leads/to-lead";

const WITH_PAYMENTS = { payments: { orderBy: { sequence: "asc" } } } as const;

/** All leads, newest first; leads without a date last. Requires a signed-in user. */
export async function getLeads(): Promise<Lead[]> {
  await requireSessionUser();
  const db = createDb();
  try {
    const rows = await db.lead.findMany({
      include: WITH_PAYMENTS,
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
    const row = await db.lead.findUnique({ where: { id }, include: WITH_PAYMENTS });
    return row ? toLead(row) : null;
  } finally {
    await releaseDb(db);
  }
}
