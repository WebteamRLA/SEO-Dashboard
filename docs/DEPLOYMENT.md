# Deployment

| Layer | Service |
| --- | --- |
| Source and CI | GitHub Actions |
| Hosting | Cloudflare Workers (paid plan), through the OpenNext adapter |
| Database | Neon PostgreSQL, reached through Cloudflare Hyperdrive |
| ORM | Prisma 7, pinned to an exact version |

The Workers paid plan is required: the free plan allows 10 ms of CPU per request.

## Secrets

Secrets never go in git, and never in `.env` files.

| Where | What |
| --- | --- |
| `.dev.vars` (git-ignored) | Local values |
| GitHub Actions secrets | `DIRECT_DATABASE_URL`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |
| Hyperdrive configuration | The runtime database connection |
| `wrangler secret put` | Other runtime secrets, as later phases add them |

**The OpenNext adapter copies `.env`, `.env.local`, and similar files into the deployed Worker.** Code
would keep working with the password inside it. `npm run build:cloudflare` runs
`scripts/check-worker-secrets.mjs`, which fails the build if any non-public variable is in the bundle.

## First-time setup

1. Create the Hyperdrive configuration, using the direct Neon connection (no `-pooler` in the host):

   ```bash
   npx wrangler hyperdrive create rla-dashboard --connection-string="<direct url>"
   ```

2. Put the returned id in `wrangler.jsonc`.
3. Create a GitHub environment named `production`, and add the Actions secrets above to it.
4. **Protect that environment:** restrict deployment branches to `main` and add a required reviewer.
   Without this, anyone with write access could run a modified workflow from a branch and reach the
   production secrets.
5. Run the **Deploy** workflow. It is manual until production is signed off.
6. Add the approved subdomain as a custom domain on the Worker.
7. Check `/api/health` returns `{"status":"ok"}`.

## What a deploy does

The workflow runs everything that can fail safely first, so a failed build never leaves production
migrated with old code:

1. Run the checks, build the Worker, and check it for secrets and size.
2. Hide the database host and name from the logs, as Prisma prints them.
3. Apply migrations.
4. Deploy the Worker.

## Database migrations

- Create migrations with `npm run db:migrate`, and commit them.
- The Deploy workflow runs `prisma migrate deploy` before releasing code.
- Migrations use the direct connection. The Neon pooler runs in transaction mode, which does not suit them.
- Migrations must be backward compatible, so the previous release keeps working if a deploy is rolled back.

## Prisma on Workers

- Create a client per request with `createDb()`. A shared global client makes later requests fail.
- Stay on Prisma 7 until Better Auth supports a newer major version. Prisma labels Workers support as Preview.
- `next.config.ts` excludes Prisma's unused engines. Without that the Worker is 58 MiB against a
  64 MiB limit. `npm run check:size` enforces a 40 MiB budget in CI.

## Running the Worker locally

`npm run preview:cloudflare` needs one variable in the shell, as wrangler refuses a Hyperdrive binding
without it. It is not read from `.dev.vars`, and putting it in `.env` fails the secrets check:

```bash
export CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE="<direct url>"
npm run preview:cloudflare
```

## Testing database code

The Prisma client is generated for Cloudflare's runtime and cannot load under Vitest, and
`src/server/db/client.ts` is server-only. Mock `@/server/db/client` in unit tests, as
`src/app/api/health/route.test.ts` does. Tests of real queries need the Workers test pool.

## Rollback

| Problem | Action |
| --- | --- |
| Bad release | `npx wrangler rollback`, or pick a version in the Cloudflare dashboard |
| Bad migration | Write a new forward migration. Do not edit an applied one |
| Bad data | Restore to a point in time with Neon's restore feature, into a branch first |

Rolling back code does not roll back the database, which is why migrations must stay backward compatible.

## Not yet verified

These need Cloudflare access and have only been tested locally on Cloudflare's runtime against Neon:

- A real deployment, and the path through real Hyperdrive, including its query caching.
- The Deploy workflow itself, and the GitHub environment protection rules.
