import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { resolveConnectionString } from "./connection";

function hyperdriveConnectionString(): string | undefined {
  try {
    return getCloudflareContext().env.HYPERDRIVE?.connectionString;
  } catch {
    // Not running on Cloudflare (next dev, Vercel).
    return undefined;
  }
}

const shared = globalThis as unknown as { __rlaPrisma?: PrismaClient };

/**
 * On Cloudflare a new client per request: Workers forbids reusing a connection
 * across requests, and a shared client makes later requests fail. Everywhere
 * else (Vercel, next dev) one client and connection pool for the whole process,
 * so requests do not each open new database connections.
 */
export function createDb(): PrismaClient {
  const hyperdrive = hyperdriveConnectionString();
  if (hyperdrive) {
    return new PrismaClient({ adapter: new PrismaPg({ connectionString: hyperdrive, maxUses: 1 }) });
  }
  if (!shared.__rlaPrisma) {
    const connectionString = resolveConnectionString({ databaseUrl: process.env.DATABASE_URL });
    shared.__rlaPrisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  }
  return shared.__rlaPrisma;
}

/** Closes a per-request client. The shared process-wide client stays open. */
export async function releaseDb(db: PrismaClient): Promise<void> {
  if (db !== shared.__rlaPrisma) await db.$disconnect();
}
