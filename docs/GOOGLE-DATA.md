# Google Search Console and GA4

The Overview shows two panels for the selected period, each compared with the
same number of days just before it:

- **Google Search performance** (Search Console): clicks, impressions, click-through rate, average position.
- **Website traffic** (GA4): sessions, users, organic sessions, organic users ("Organic Search" default channel group).

The period ends yesterday at the latest, because today's data is incomplete in both
sources. Search Console counts days in Pacific Time; GA4 uses the property's time zone.
Search Console figures include the newest, not-yet-final days, so the most recent
day or two can still shift slightly.

## Traffic & SEO pages

The three pages under **Traffic & SEO** use the same connection and the same
selected period (ending yesterday), each compared with the same number of days before it:

- **Traffic overview** (`/traffic-seo`): GA4 visits (sessions), visitors (users), visits
  from search and AI, and form submissions (GA4 key events); visits over time split into
  search and AI versus other channels; visits by channel; the top 10 landing pages with
  their share from search and AI and their key events. "Search and AI" is GA4's Organic
  Search channel plus sessions whose source is an AI assistant (ChatGPT, Perplexity,
  Gemini, Copilot, Claude and others; `AI_SOURCE_PATTERN` in
  `src/server/google/traffic-overview.ts`), shown as their own "AI Search" channel. GA4
  has no AI channel and files most of these under Referral.
- **Search Performance**: the four Search Console metrics, a chart for each, and the
  top 250 queries by clicks with position change against the previous period.
  Google hides rare queries for privacy, so the query rows add up to less than the totals.
- **Visitors**: GA4 sessions, users, organic and referral sessions; all vs organic
  sessions over time; sessions by default channel group. GA4 estimates session counts,
  so daily or per-channel figures can add up to slightly more or less than the total.

Charts show one point per day for periods up to 92 days, and one per month beyond that.
If a source has no data for the previous period (for example, before the property
existed), the cards say so instead of showing a change. Code: `src/server/google/analytics.ts`
(pure, tested), `src/lib/data/google.ts`, `src/features/traffic/`.

## How it connects

One Google Cloud **service account** reads both sources. There is no "Sign in with
Google" step and no token to refresh: the server signs a short-lived request with the
service account's key (`src/server/google/credentials.ts`, Web Crypto, no SDK).
Results are cached for 10 minutes per server instance. Each source works on its own,
so Search Console can be live while GA4 still waits for access. A source that is not
set up shows "Not connected yet"; one that fails shows the reason. Neither breaks the page.

## Setup (once)

1. **Google Cloud project.** Use the project that holds the sign-in OAuth client, or any other.
2. **Enable APIs** (APIs & Services > Library):
   - Google Search Console API
   - Google Analytics Data API
   - Google Analytics Admin API (optional; only lets `npm run check:google` list properties)
3. **Create the service account** (IAM & Admin > Service accounts > Create). No project
   roles are needed. Open it > Keys > Add key > JSON. Keep the file out of this repository.
   If key creation is blocked, the organisation policy
   `iam.disableServiceAccountKeyCreation` must be relaxed for this project by a Google
   Workspace admin.
4. **Grant Search Console access.** Search Console > the RLA property > Settings >
   Users and permissions > Add user: the service account email, permission
   **Restricted** (read-only is enough).
5. **Grant GA4 access.** GA4 > Admin > Property access management > + > the service
   account email, role **Viewer**.
6. **Set the variables** in `.dev.vars` (and in the host's environment for production):

   ```
   GOOGLE_SERVICE_ACCOUNT_KEY="<output of: base64 -w0 key.json>"
   GSC_SITE_URL="sc-domain:rightleftagency.com"
   GA4_PROPERTY_ID="123456789"
   ```

   `GSC_SITE_URL` must match the property exactly as Search Console names it: a domain
   property is `sc-domain:example.com`, a URL-prefix property is the full URL with the
   trailing slash. `GA4_PROPERTY_ID` is the numeric ID, not the `G-` measurement ID.
   The key may also be the raw JSON wrapped in single quotes; base64 avoids quoting trouble.
7. **Confirm access:** `npm run check:google`. It lists every site and property the
   service account can see, then runs one query against each configured one, and exits
   non-zero until both work. Restart `npm run dev` afterwards to load the new variables.

## Site health

`/site-health` shows three checks, each stored as a row in `site_health_run` and read
from there (the page never checks live):

- **Speed** (daily): Google PageSpeed Insights, mobile, for the home page. Needs
  `PAGESPEED_API_KEY`, a Google Cloud API key with the PageSpeed Insights API enabled.
  Core Web Vitals come from real Chrome visitors when Google has enough of them for the
  site; until then the panel shows the lab test and says so.
- **Indexing** (daily): Search Console URL Inspection for every sitemap page, with the
  same service account. About 2 minutes for 361 pages, 20 at a time. Each run uses one
  inspection per page from the property's 2,000 a day. A run that runs short keeps the
  previous result for pages it did not reach, and the next run starts with those.
- **Site check** (Mondays): visits every sitemap page on the site's own host, then the
  internal links that are not sitemap pages, and lists issues (broken pages and links,
  redirects in the sitemap, missing titles, descriptions and H1s, duplicates, noindex
  pages in the sitemap, images without alt text). "Technical fixes" counts issues the
  previous check found that the latest no longer finds, on pages it re-checked.

The schedule is in `vercel.json` (`/api/cron/site-health?task=daily|weekly`); Vercel
sends `CRON_SECRET`, and without it set the route refuses to run. Admins can also click
**Run checks now**. Each invocation gets about four minutes of work: speed, then the
site check, then indexing.

## Troubleshooting

| Message | Cause |
| --- | --- |
| `invalid_grant: account not found` | The key belongs to a deleted service account, or the JSON is from another project. |
| `the API is not enabled` | Step 2 was skipped for the project that owns the service account. |
| `no access to this property yet (403)` | Step 4 or 5 is missing, or the site URL / property ID does not match. |
| Search Console lists no sites | The user was added to a different property (e.g. the `https://` one instead of `sc-domain:`). |

## Status: Phase 2

The Overview panels are switched off until the service account has been given access
in Search Console and GA4 (steps 4 and 5). The code is kept and tested: to switch the
panels back on, render `<GooglePanels google={google} />` in
`src/features/overview/overview-view.tsx` again, with `getGoogleOverview(range, today)`
loaded in `src/app/(dashboard)/(lead-pages)/overview/page.tsx`.
