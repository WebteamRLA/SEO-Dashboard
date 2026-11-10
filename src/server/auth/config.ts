import "server-only";
import { parseEmailList } from "./access";

export interface AuthConfig {
  secret: string;
  baseURL: string;
  google: { clientId: string; clientSecret: string };
  bootstrapAdmins: string[];
}

/**
 * Sign-in settings from the environment, or null when any are missing. Callers
 * treat null as "nobody is signed in", so a misconfigured deploy shows the login
 * page with a notice and never serves the dashboard.
 */
export function getAuthConfig(): AuthConfig | null {
  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  const baseURL = process.env.BETTER_AUTH_URL?.trim().replace(/\/$/, "");
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!secret || !baseURL || !clientId || !clientSecret) return null;
  return {
    secret,
    baseURL,
    google: { clientId, clientSecret },
    bootstrapAdmins: parseEmailList(process.env.AUTH_BOOTSTRAP_ADMINS),
  };
}
