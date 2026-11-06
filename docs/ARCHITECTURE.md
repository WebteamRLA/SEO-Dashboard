# Frontend Architecture

Central Organic Dashboard for RightLeft Agency (RLA). This is the Step 1 frontend: every page is
built, using sample data only. There is no database, authentication, or external integration yet.

## Stack

Next.js 16 (App Router), React 19, strict TypeScript, Tailwind CSS 4, shadcn/ui on Radix, Lucide
icons, Recharts, dnd-kit, and Vitest. Deployment target: Cloudflare, through the OpenNext adapter.

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
| AI Agents | `/ai-agents`, `/ai-agents/[slug]` | P3, except the Lead Filter Agent (P1) |
| Delivery Roadmap | `/delivery-roadmap` | P1 |
| Settings | `/settings/integrations`, `/settings/forms`, `/settings/team`, `/settings/notifications` | P1 |

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

## Global month filter

The month lives in the URL as `?month=YYYY-MM`, so a view can be shared and the server can read it.
Pages call `resolveMonth(searchParams.month)`, which rejects anything that is not a known month. The
topbar selector appears on routes marked `monthScoped` in `config/navigation.ts`.

Use `MonthLink` (or `useMonthHref`), not `next/link`, for links between dashboard pages. One plain link
would silently reset the selected month for the rest of the session.

## Lead state

`features/leads/leads-store.tsx` holds leads for the whole dashboard, so a pipeline move also shows
in the inbox, lead details, Overview, Revenue, and Reports. Any page showing lead data reads
`useLeads()` rather than server props. Changes last until the page reloads, and the lead pages say so. Step 2 swaps the store internals for Server
Actions; consumers of `useLeads()` do not change.

## Honesty rules for sample data

- The topbar shows a **Sample data** chip. Phones, where it does not fit, get a banner instead.
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

`cacheComponents` and `partialPrefetching` are off. The Next docs state that Cache Components requires
the Node.js runtime and that other server runtimes are not guaranteed to work, and this app targets
Cloudflare Workers. Next's documentation says both features become always-on in the next major
version, so re-check Cloudflare support before that upgrade.

The dashboard layout calls `await connection()`, so its pages render per request. Live data will need
a session anyway, and this is the documented replacement for `dynamic = "force-dynamic"`.

Cloudflare configuration itself is out of scope for Step 1. The app avoids anything that would block
it: no `next/image` optimizer, no Node-only APIs, and no filesystem access at runtime.

## HTTP status codes

`(dashboard)/loading.tsx` starts the response stream before a page resolves, so `notFound()` and
`redirect()` inside a page return HTTP 200 and complete in the browser. Both behave correctly for
users. This is fine for a private, non-indexed app, but monitoring should not rely on these status
codes. `/settings` is one such redirect.

## Moving to Step 2

| Replace | With | Unchanged |
| --- | --- | --- |
| Function bodies in `lib/data/*` | Database and API calls | Pages and components |
| State updates in `leads-store.tsx` | Server Actions | `useLeads()` consumers, `lib/domain` rules |
| `getCurrentUser()` | The authenticated session | The shell |
| `getReferenceDate()` | The real clock | Date presets |
| Toasts on placeholder actions | Real actions | The surrounding UI |

Then delete `src/mocks/`.

## Testing

`npm run check` runs types, lint, unit tests, and the production build. Run it in full before calling
anything verified: it stops at the first failure. Unit tests cover the business rules in `lib/domain`,
helpers, and feature logic. `src/mocks/mocks.test.ts` asserts that sample data never shows something
impossible, such as an event after "today". There are no automated browser tests in the repo yet.
