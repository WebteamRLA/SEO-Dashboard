import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is deliberately off. The Next docs state it requires the
  // Node.js runtime and that other server runtimes "are not guaranteed to work",
  // and this app targets Cloudflare Workers. A private dashboard also gains
  // little from a prerendered shell. See docs/ARCHITECTURE.md before enabling.
  cacheComponents: false,
  partialPrefetching: false,
  // Workers has a 64 MiB limit. Without these two settings Prisma pulls in every
  // database engine, an embedded Postgres, and dev tooling: 58 MiB, against
  // 16 MiB with them. CI enforces the budget, see scripts/check-worker-size.mjs.
  serverExternalPackages: ["@prisma/client", "pg"],
  outputFileTracingExcludes: {
    "*": [
      "node_modules/prisma/**",
      "node_modules/@prisma/engines/**",
      "node_modules/@prisma/studio-core/**",
      "node_modules/@prisma/dev/**",
      "node_modules/@electric-sql/**",
      "node_modules/workerd/**",
      "node_modules/@cloudflare/workerd*/**",
      "node_modules/wrangler/**",
      "node_modules/@next/swc*/**",
      "node_modules/@rolldown/**",
      "node_modules/esbuild/**",
      "node_modules/@esbuild/**",
      "node_modules/lightningcss*/**",
      "node_modules/typescript/**",
      "node_modules/@ts-morph/**",
      "node_modules/shadcn/**",
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
