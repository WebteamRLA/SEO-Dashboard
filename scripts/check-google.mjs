// Confirms the dashboard's Google service account can read Search Console and GA4.
//
//   npm run check:google
//
// Reads GOOGLE_SERVICE_ACCOUNT_KEY, GSC_SITE_URL and GA4_PROPERTY_ID from .dev.vars,
// lists every Search Console site and GA4 property the service account can see
// (to help find the right IDs), then runs one small query against each configured
// property. Prints names and IDs only, never the key. Exits 1 if anything fails.

// Node strips the types from this file at load time; it has no imports.
import { fetchAccessToken, parseServiceAccountKey } from "../src/server/google/credentials.ts";

try {
  process.loadEnvFile(".dev.vars");
} catch {
  console.warn("No .dev.vars found; using the current environment.");
}

let failed = false;
const ok = (message) => console.log(`  ✓ ${message}`);
const bad = (message) => {
  failed = true;
  console.log(`  ✗ ${message}`);
};

async function call(token, url, body) {
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const json = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, json, message: json?.error?.message ?? "" };
}

console.log("Service account");
const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
if (!rawKey?.trim()) {
  bad("GOOGLE_SERVICE_ACCOUNT_KEY is not set in .dev.vars. See docs/GOOGLE-DATA.md.");
  process.exit(1);
}
let key;
let token;
try {
  key = parseServiceAccountKey(rawKey);
  ok(`Key read for ${key.clientEmail}`);
  token = (await fetchAccessToken(key)).token;
  ok("Signed in to Google");
} catch (error) {
  bad(error.message);
  process.exit(1);
}

console.log("\nSearch Console");
const sites = await call(token, "https://www.googleapis.com/webmasters/v3/sites");
const site = process.env.GSC_SITE_URL?.trim();
if (!sites.ok) {
  bad(`Could not list sites (${sites.status}). ${sites.message}`);
} else {
  const entries = sites.json.siteEntry ?? [];
  if (entries.length === 0) {
    bad(`No sites shared yet. In Search Console > Settings > Users and permissions, add ${key.clientEmail}.`);
  } else {
    console.log("  Sites this account can read:");
    for (const entry of entries) console.log(`    ${entry.siteUrl}  (${entry.permissionLevel})`);
  }
  if (!site) {
    bad("GSC_SITE_URL is not set. Copy one of the sites above, e.g. sc-domain:rightleftagency.com.");
  } else if (entries.length > 0) {
    const today = new Date();
    const day = (offset) => new Date(today.getTime() - offset * 86_400_000).toISOString().slice(0, 10);
    const query = await call(
      token,
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`,
      { startDate: day(28), endDate: day(1), dataState: "all" },
    );
    if (query.ok) {
      const row = query.json.rows?.[0] ?? {};
      ok(`${site}: ${row.clicks ?? 0} clicks, ${row.impressions ?? 0} impressions in the last 28 days`);
    } else {
      bad(`${site}: query failed (${query.status}). ${query.message}`);
    }
  }
}

console.log("\nGoogle Analytics 4");
const summaries = await call(token, "https://analyticsadmin.googleapis.com/v1beta/accountSummaries");
if (summaries.ok) {
  const properties = (summaries.json.accountSummaries ?? []).flatMap((account) =>
    (account.propertySummaries ?? []).map((property) => ({ ...property, account: account.displayName })),
  );
  if (properties.length === 0) {
    console.log(`  No properties shared yet. In GA4 > Admin > Property access management, add ${key.clientEmail} as a Viewer.`);
  } else {
    console.log("  Properties this account can read:");
    for (const property of properties) {
      console.log(`    ${property.property.replace("properties/", "")}  ${property.displayName}  (${property.account})`);
    }
  }
} else {
  // Optional: listing needs the Admin API too. The dashboard itself only needs the Data API.
  console.log(`  (Could not list properties: enable the "Google Analytics Admin API" to see them here. ${summaries.status})`);
}
const property = process.env.GA4_PROPERTY_ID?.trim().replace(/^properties\//, "");
if (!property) {
  bad("GA4_PROPERTY_ID is not set. Use the numeric property ID (GA4 > Admin > Property details).");
} else if (!/^\d+$/.test(property)) {
  bad(`GA4_PROPERTY_ID "${property}" is not a numeric property ID (a G-XXXX measurement ID will not work).`);
} else {
  const report = await call(
    token,
    `https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`,
    { dateRanges: [{ startDate: "28daysAgo", endDate: "yesterday" }], metrics: [{ name: "sessions" }] },
  );
  if (report.ok) {
    ok(`Property ${property}: ${report.json.rows?.[0]?.metricValues?.[0]?.value ?? 0} sessions in the last 28 days`);
  } else {
    bad(`Property ${property}: report failed (${report.status}). ${report.message}`);
  }
}

console.log(failed ? "\nNot ready yet: fix the items marked ✗." : "\nAccess confirmed for both sources.");
process.exit(failed ? 1 : 0);
