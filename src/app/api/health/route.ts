import { createDb } from "@/server/db/client";

/** Public, so it reports only up or down. Details go to the logs. */
export async function GET() {
  const db = createDb();
  try {
    await db.$queryRaw`select 1`;
    return Response.json({ status: "ok" }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("Health check failed", error);
    return Response.json({ status: "unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
  } finally {
    await db.$disconnect();
  }
}
