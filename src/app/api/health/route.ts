import type { PrismaClient } from "@/generated/prisma/client";
import { createDb, releaseDb } from "@/server/db/client";

const NO_STORE = { "cache-control": "no-store" };

/** Public, so it reports only up or down. Details go to the logs. */
export async function GET() {
  let db: PrismaClient | undefined;
  try {
    db = createDb();
    // Not `select 1`: Hyperdrive caches eligible reads, which could report a
    // healthy database for a minute into an outage. `now()` is never cached.
    await db.$queryRaw`select now()`;
    return Response.json({ status: "ok" }, { headers: NO_STORE });
  } catch (error) {
    console.error("Health check failed", error);
    return Response.json({ status: "unavailable" }, { status: 503, headers: NO_STORE });
  } finally {
    if (db) await releaseDb(db);
  }
}
