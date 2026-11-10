import "server-only";
import { parseServiceAccountKey, type ServiceAccountKey } from "./credentials";
import { normalizePropertyId } from "./reports";

export class GoogleConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleConfigError";
  }
}

/**
 * One service account reads both sources. Each source is configured on its
 * own, so Search Console can work while GA4 is still waiting for access.
 */
export function getServiceAccount(): ServiceAccountKey {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw?.trim()) {
    throw new GoogleConfigError("Google is not connected. Set GOOGLE_SERVICE_ACCOUNT_KEY.");
  }
  return parseServiceAccountKey(raw);
}

/** e.g. "sc-domain:rightleftagency.com" or "https://www.rightleftagency.com/". */
export function getSearchConsoleSite(): string {
  const site = process.env.GSC_SITE_URL?.trim();
  if (!site) throw new GoogleConfigError("Search Console is not connected. Set GSC_SITE_URL.");
  return site;
}

export function getGa4PropertyId(): string {
  const raw = process.env.GA4_PROPERTY_ID?.trim();
  if (!raw) throw new GoogleConfigError("GA4 is not connected. Set GA4_PROPERTY_ID.");
  const id = normalizePropertyId(raw);
  if (!id) throw new GoogleConfigError("GA4_PROPERTY_ID must be the numeric property ID, e.g. 123456789.");
  return id;
}
