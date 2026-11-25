/**
 * URL helpers shared by the site check and the indexing check.
 */

/** Same page whatever the scheme, "www.", host case, #fragment or trailing slash. */
export function pageKey(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.length > 1 ? parsed.pathname.replace(/\/+$/, "") : parsed.pathname;
    return `${parsed.hostname.toLowerCase().replace(/^www\./, "")}${path}${parsed.search}`;
  } catch {
    return url;
  }
}

/** The site's host without "www.", for keeping the checks on the site itself. */
export function siteHost(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** An http(s) URL on `host` (with or without "www."). Anything else is not the site's to check. */
export function isOnSite(url: string, host: string): boolean {
  try {
    const parsed = new URL(url);
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && parsed.hostname.toLowerCase().replace(/^www\./, "") === host;
  } catch {
    return false;
  }
}
