export interface ConnectionSources {
  /** Hyperdrive binding, present when running on Cloudflare. */
  hyperdrive?: string;
  /** DATABASE_URL, used by `next dev`. */
  databaseUrl?: string;
}

/** Prefers Hyperdrive. Fails loudly rather than connecting to nothing. */
export function resolveConnectionString({ hyperdrive, databaseUrl }: ConnectionSources): string {
  const connectionString = hyperdrive || databaseUrl;
  if (!connectionString) {
    throw new Error("No database connection: set the HYPERDRIVE binding or DATABASE_URL.");
  }
  return connectionString;
}
