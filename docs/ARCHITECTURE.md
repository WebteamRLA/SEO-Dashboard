# Frontend Architecture

Central Organic Dashboard for RightLeft Agency (RLA). This is the Step 1 frontend: every page is
built, using sample data only. There is no database, authentication, or external integration yet.

## Stack

Next.js 16 (App Router), React 19, strict TypeScript, Tailwind CSS 4, shadcn/ui on Radix, Lucide
icons, Recharts, and Vitest. Deployment target: Cloudflare, through the OpenNext adapter.

## Structure

```
src/
  app/
    page.tsx                  Redirects to /overview
    (dashboard)/              All pages. layout.tsx loads the shell and lead store
  components/
    ui/                       shadcn primitives. Generated, generally left as they are
    layout/                   App shell, sidebar, topbar, page header, month selector
    data/                     Data table, filters, metric cards, badges, empty states, dialogs
    charts/                   Chart wrappers, chart card with table view, ranked bars
  features/<area>/            Page-specific client components, one folder per product area
  config/navigation.ts        Single source of truth for routes, labels, and phases
  lib/
    types/                    Domain types
    domain/                   Pure business rules, with unit tests
    data/                     Data access layer. Server-only
    format.ts, month.ts       Formatting and month helpers
  mocks/                      Sample data. Imported only by lib/data
```

## Routes

`config/navigation.ts` is the source of truth for labels and phases.

| Area | Route | Phase |
| --- | --- | --- |
| Overview | `/overview` | P1 |
| Work | `/work` | P1 |
| Roadmap | `/roadmap` | P1 |
| Leads | `/leads`, `/leads/[id]`, `/leads/pipeline` | P1 |
| Traffic & SEO | `/traffic-seo`, `/traffic-seo/search-performance`, `/traffic-seo/visitors` | P2 |
| Traffic & SEO | `/traffic-seo/behavior`, `/traffic-seo/social` | P3 |
| Revenue | `/revenue` | P2 |
| Site Health | `/site-health/forms`, `/site-health/broken-links`, `/site-health/issues` | P2 |
| Reports | `/reports` | P2 |
| AI Agents | `/ai-agents`, `/ai-agents/[slug]` | P3, except the Lead Filter Agent (P2) |
| Settings | `/settings/team`, `/settings/notifications`, `/settings/delivery-roadmap` | P1 |

## Data flow

```
mocks/ -> lib/data/ (async, server-only) -> Server Component page -> features/ client components
```

- **Pages are Server Components.** They `await` functions from `lib/data` and pass plain data down.
- **`lib/data` is the backend seam.** Step 2 replaces the function bodies with database and API
  calls. Signatures stay the same, so pages and components do not change. These functions contain no
  simulated delays or fake network calls.
- **`mocks/` is never imported from UI code.** `lib/data` modules start with `import "server-only"`,
  which turns a client import into a build error.
- **Business rules live in `lib/domain`** as pure functions, independent of React, and survive the
  move to a real backend. Roadmap status is derived from linked tasks, so the roadmap can never
  disagree with the work tracker.

## Reporting period

The period lives in the URL so a view can be shared and the server can read it: a preset by name
(`?range=this-month`, so a bookmark stays current) or custom dates (`?from=2026-10-03&to=2026-11-10`).
Older `?month=YYYY-MM` links still work and mean that whole month. Pages call
`resolvePagePeriod(searchParams)`, which validates the untrusted input and falls back to This month.
All logic is in `src/lib/date-range.ts`; dates are UTC calendar dates and ranges include both ends.

The topbar `DateRangeFilter` appears on routes marked `periodScoped` in `config/navigation.ts`. Use
`PeriodLink` (or `usePeriodHref`), not `next/link`, for links between dashboard pages, so the period is
kept. Leads count by submission date, tasks by completion date (open tasks by due date), and monthly
data, such as roadmap items and the sample traffic figures, by the months the period touches.

## Lead state

Leads come from Courtney's Teamwork project "Pipeline - Business Development" (id 761381, override
with `TEAMWORK_PIPELINE_PROJECT_ID`), read-only, as the CEO meeting decided: Teamwork is the CRM.
`fetchPipeline` in `server/teamwork/client.ts` reads every card plus the board's workflow stages,
behind the same stale-while-revalidate cache as the SEO tasks (fresh 1 min, served stale up to 30
min). The pure, tested `server/teamwork/pipeline-map.ts` turns each open card into a `Lead`:

- **Column:** the card's workflow stage, kept as `lead.teamwork.column` (name, order, colour), and
  grouped into `lead.stage` (new, contacted, meeting, proposal, won, lost) by column name for the
  counts. Cards in no stage are Teamwork's Backlog. Completed cards are left out, as on the board.
- **Source:** the card's tags (Organic (Search), Organic (AI), Referral, Cold Email, Conference...).
- **Contact:** parsed from the description template "Source / Contact Name / Contact Email /
  Website / Notes".
- **No money:** Teamwork has no deal values, so `dealValue` is empty; revenue is to come from
  QuickBooks.

`lib/data/leads.ts` serves these to everything that shows leads (lead pages, Overview, Revenue,
monthly reports, the bell). `features/leads/leads-store.tsx` holds them for the lead pages, loaded
once by `app/(dashboard)/(lead-pages)/layout.tsx`. Nothing is written back to Teamwork. The Sync
button (`server/leads/sync.ts`) skips the cache for a fresh copy, then refreshes the page.

The website-form webhook (Fluent Forms) and its new-lead email were removed on 2026-11-24. The
`lead` table and the sheet import (`npm run import:leads`) remain but no screen reads them.

## Notifications

The topbar bell is built per request from live data only, by the pure, tested
`buildNotificationFeed` in `src/server/notifications/feed.ts`: genuine leads
submitted in the last 14 days, SEO tasks completed in Teamwork in the last 7
days, and open SEO tasks past their due date. At most five of each kind and
eight in all, newest first. The layout passes the feed to the topbar as a
promise, so the page never waits on Teamwork; if Teamwork fails, only the task
items drop out.

Opening the menu calls the `markNotificationsSeen` Server Action, which sets an
httpOnly cookie (`rla_notifications_seen`) holding the time. Items no newer than
that time are read, so the red dot shows only for what arrived since. The state
is per browser, not per account, which keeps it out of the database. The cookie
is untrusted input: a malformed value, or one in the future, counts as never
seen.

Settings > Notifications saves each person's choices (`notification_preference`); events that are
not delivered yet stay disabled. "New lead received" adds cards added to the Teamwork Pipeline in the
last 14 days to the bell (off removes them). It has no email: that was sent by the removed website
webhook, so its email switch is off and disabled.

## Authentication

Google sign-in through Better Auth, with sessions in Postgres. There are no passwords.

- **Invite-only.** A Google account may sign in only if its email is verified by Google and it is in
  `access_invite` or `AUTH_BOOTSTRAP_ADMINS`. The rules are in `src/server/auth/access.ts` and
  `hooks.ts`, and run on every sign-in, so removing an invite blocks the next sign-in. An existing
  session lasts until it expires (7 days) unless it is deleted.
- **Roles** are `admin`, `manager`, and `member`, taken from the invite on each sign-in.
- **Protection.** `(dashboard)/layout.tsx` calls `requireSessionUser()` before loading any data, so an
  anonymous request gets a redirect to `/login`. New server actions and API routes must check the
  session themselves: the layout does not protect them.
- **Fails closed.** Without the sign-in variables, `getSessionUser()` returns null, so every page sends
  people to a login page that says sign-in is not set up.
- **Request forgery.** Better Auth refuses cross-site requests that carry a session cookie, and any
  `callbackURL` outside `BETTER_AUTH_URL`.
- Invites are not yet managed in the UI: add a row to `access_invite`. Leads remain sample data,
  attributed to the sample team, not to the signed-in user.

## Honesty rules for sample data

- There is no global sample-data marker any more. Pages still showing sample data say so where it
  matters: P2 and P3 pages carry a phase badge and a `PreviewNotice`.
- P2 and P3 pages carry a phase badge and a `PreviewNotice`.
- Delivery dates stay "To be confirmed" until a date is actually confirmed. `plannedDate` is `null`.
- Sample people use fictional names and reserved `.example` domains. Sample phone numbers use the
  reserved 555-01xx range.
- Actions that need a backend say so in a toast. They never pretend to have succeeded.

## Sample calendar

Sample data runs to a fixed "today" of 2026-11-06 (`mocks/calendar.ts`), so relative filters do not
drift. The default month is October 2026, the latest complete month.

Month-by-month lead, revenue, and traffic charts plot complete months only. Plotting six days of November beside
full months reads as a collapse in traffic, and a caption does not reliably correct that. Metric
cards for the month in progress say "Month in progress" instead of a comparison.

## Charts

Charts follow one system: a fixed categorical palette (`--series-1` to `--series-8`, validated for
colour-blind separation on white), one axis per chart, thin marks, and a legend for two or more
series. Three palette slots fall below 3:1 contrast, so `ChartCard` requires a table view: no value
ever depends on seeing a colour. Comparisons between categories use `RankedBars`, not donuts. Status
colours are reserved for state and are always paired with a text label.

## Rendering and Cloudflare

See [DEPLOYMENT.md](DEPLOYMENT.md) for infrastructure. `cacheComponents` and `partialPrefetching` are off. The Next docs state that Cache Components requires
the Node.js runtime and that other server runtimes are not guaranteed to work, and this app targets
Cloudflare Workers. Next's documentation says both features become always-on in the next major
version, so re-check Cloudflare support before that upgrade.

The dashboard layout calls `await connection()`, so its pages render per request. Live data will need
a session anyway, and this is the documented replacement for `dynamic = "force-dynamic"`.

The app avoids anything Workers cannot run: no `next/image` optimizer, no filesystem access at runtime.

## HTTP status codes

`(dashboard)/loading.tsx` starts the response stream before a page resolves, so `notFound()` and
`redirect()` inside a page return HTTP 200 and complete in the browser. Both behave correctly for
users. This is fine for a private, non-indexed app, but monitoring should not rely on these status
codes. `/settings` is one such redirect.

## Moving to Step 2

| Replace | With | Unchanged |
| --- | --- | --- |
| Function bodies in `lib/data/*` | Database and API calls | Pages and components |
| `getCurrentUser()` | The authenticated session | The shell |
| `getReferenceDate()` | The real clock | Date presets |
| Toasts on placeholder actions | Real actions | The surrounding UI |

This table is out of date in one respect: lead data cannot stay in a client store seeded with every
lead, so `useLeads()` is replaced by server-side paging and Server Actions in Phase 2. `src/mocks/` stays,
because the P2 and P3 previews still use it.

## Testing

`npm run check` runs types, lint, unit tests, and the production build. Run it in full before calling
anything verified: it stops at the first failure. Unit tests cover the business rules in `lib/domain`,
helpers, and feature logic. `src/mocks/mocks.test.ts` asserts that sample data never shows something
impossible, such as an event after "today". There are no automated browser tests in the repo yet.
