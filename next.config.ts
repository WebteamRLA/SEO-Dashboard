import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is deliberately off. The Next docs state it requires the
  // Node.js runtime and that other server runtimes "are not guaranteed to work",
  // and this app targets Cloudflare Workers. A private dashboard also gains
  // little from a prerendered shell. See docs/ARCHITECTURE.md before enabling.
  cacheComponents: false,
  partialPrefetching: false,
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
