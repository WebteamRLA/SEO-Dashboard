import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { resolveConnectionString } from "./connection";

function hyperdriveConnectionString(): string | undefined {
  try {
    return getCloudflareContext().env.HYPERDRIVE?.connectionString;
  } catch {
    // `next dev` has no Cloudflare context.
    return undefined;
  }
}

/**
 * Creates a client for the current request. Call this inside a request, and
 * never store the result globally: Workers forbids reusing a connection across
 * requests, and a global client makes later requests fail.
 */
export function createDb(): PrismaClient {
  const connectionString = resolveConnectionString({
    hyperdrive: hyperdriveConnectionString(),
    databaseUrl: process.env.DATABASE_URL,
  });
  return new PrismaClient({ adapter: new PrismaPg({ connectionString, maxUses: 1 }) });
}
