import { defineConfig } from "prisma/config";

// CI provides these directly. Locally they come from the git-ignored .dev.vars.
try {
  process.loadEnvFile(".dev.vars");
} catch {
  // No file: rely on the environment.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  // Migrations use the direct connection: the Neon pooler runs in transaction
  // mode, which does not suit them. `prisma generate` needs no database, so the
  // value may be empty on install.
  datasource: { url: process.env.DIRECT_DATABASE_URL ?? "" },
});
