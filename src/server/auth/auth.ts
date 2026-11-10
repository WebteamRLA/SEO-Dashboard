import "server-only";
import { cache } from "react";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import type { PrismaClient } from "@/generated/prisma/client";
import { createDb } from "@/server/db/client";
import { getAuthConfig, type AuthConfig } from "./config";
import { createAccessHooks } from "./hooks";

function createAuth(config: AuthConfig, db: PrismaClient) {
  return betterAuth({
    appName: "SEO Dashboard",
    baseURL: config.baseURL,
    secret: config.secret,
    trustedOrigins: [config.baseURL],
    database: prismaAdapter(db, { provider: "postgresql" }),
    // Google only: no passwords to store, reset, or leak.
    emailAndPassword: { enabled: false },
    socialProviders: {
      google: {
        clientId: config.google.clientId,
        clientSecret: config.google.clientSecret,
        // Lets people with several Google accounts choose the right one.
        prompt: "select_account",
      },
    },
    user: {
      additionalFields: {
        role: { type: "string", defaultValue: "member", input: false },
      },
    },
    // Invite-only: see hooks.ts.
    databaseHooks: createAccessHooks(db, config.bootstrapAdmins),
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;

/**
 * The auth instance for the current request, or null when sign-in is not
 * configured. Per request because, on Cloudflare, database clients cannot be
 * shared across requests.
 */
export const getAuth = cache((): Auth | null => {
  const config = getAuthConfig();
  return config ? createAuth(config, createDb()) : null;
});
