import type { NextConfig } from "next";

/**
 * node_modules folders that no server route loads at runtime, kept out of the
 * build's file traces. The Cloudflare build (OpenNext) copies every traced file,
 * so anything traced here costs build time and disk; only what the Worker
 * actually imports reaches the bundle. CI checks the Worker against its size
 * budget, see scripts/check-worker-size.mjs.
 *
 * Why the list is long: Turbopack loads WebAssembly (Prisma's query compiler)
 * through a loader that resolves a dynamic path, so any route using Prisma
 * traces almost all of node_modules: 36,335 files for /api/health, against
 * about 165 for other routes. That is upstream in Next 16.4.5 and cannot be
 * fixed here, so the irrelevant packages are excluded instead.
 *
 * Never add `pg` or `@prisma/client`: they are external and must be traced.
 * A missing runtime package fails the Cloudflare build loudly, not silently.
 */
const UNTRACED_PACKAGES = [
  // Prisma CLI, migration engine, and the embedded Postgres it ships for dev.
  "prisma",
  "@prisma/engines",
  "@prisma/studio-core",
  "@prisma/dev",
  "@electric-sql",
  // Build tools.
  "workerd",
  "@cloudflare/workerd*",
  "wrangler",
  "@next/swc*",
  "@rolldown",
  "rolldown",
  "esbuild",
  "@esbuild",
  "lightningcss*",
  "typescript",
  "@ts-morph",
  "shadcn",
  "@shadcn",
  "@babel",
  "caniuse-lite",
  // Lint and test tooling.
  "eslint",
  "eslint-*",
  "@eslint",
  "@typescript-eslint",
  "typescript-eslint",
  "es-abstract",
  "es-iterator-helpers",
  "aria-query",
  "axobject-query",
  "jsx-ast-utils",
  "axe-core",
  "hermes-parser",
  "vitest",
  "@vitest",
  "vite",
  "fast-check",
  // Deploy tooling that @opennextjs/cloudflare depends on. The Worker uses
  // only its small getCloudflareContext helper, which Turbopack bundles.
  "cloudflare",
  "@aws-sdk",
  "@smithy",
  "effect",
  "miniflare",
  "@modelcontextprotocol",
  "@dotenvx",
  "execa",
  "prompts",
  "systeminformation",
  // Libraries Turbopack bundles into the server chunks. Next does not load
  // them from node_modules at runtime (none is on its default external list).
  "lucide-react",
  "recharts",
  "es-toolkit",
  "lodash",
  "zod",
  "remeda",
  "@visx",
  "victory-vendor",
];

const nextConfig: NextConfig = {
  // Cache Components is deliberately off. The Next docs state it requires the
  // Node.js runtime and that other server runtimes "are not guaranteed to work",
  // and this app targets Cloudflare Workers. A private dashboard also gains
  // little from a prerendered shell. See docs/ARCHITECTURE.md before enabling.
  cacheComponents: false,
  partialPrefetching: false,
  serverExternalPackages: ["@prisma/client", "pg"],
  outputFileTracingExcludes: {
    "*": UNTRACED_PACKAGES.map((name) => `node_modules/${name}/**`),
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
    ignoreIssue: [
      {
        // The broad-pattern warning from Turbopack's own WebAssembly loader,
        // explained above. Its effect is handled by UNTRACED_PACKAGES, so the
        // warning is scoped to this one file and message and nothing else.
        path: /loadWasm\.ts/,
        description: /Overly broad patterns/,
      },
    ],
  },
};

export default nextConfig;
