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
3. Add the GitHub Actions secrets above, in an environment named `production`.
4. Run the **Deploy** workflow. It is manual until production is signed off.
5. Add the approved subdomain as a custom domain on the Worker.
6. Check `/api/health` returns `{"status":"ok"}`.

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

## Rollback

| Problem | Action |
| --- | --- |
| Bad release | `npx wrangler rollback`, or pick a version in the Cloudflare dashboard |
| Bad migration | Write a new forward migration. Do not edit an applied one |
| Bad data | Restore to a point in time with Neon's restore feature, into a branch first |

Rolling back code does not roll back the database, which is why migrations must stay backward compatible.

## Not yet verified

These need Cloudflare access and have only been tested locally on Cloudflare's runtime against Neon:

- A real deployment, and the path through real Hyperdrive.
- The Deploy workflow itself.
