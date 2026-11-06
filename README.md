# Central Organic Dashboard

A central dashboard for RightLeft Agency (RLA) covering SEO work, roadmaps, leads, revenue, traffic,
site health, and reports.

**Current state: Step 2, Phase 1.** The infrastructure is in place, but every page still shows sample
data, and there is no sign-in yet.

## Getting started

Requires Node.js 24.

```bash
npm install
cp .dev.vars.example .dev.vars   # then fill in the values
npm run dev
```

> Keep secrets in `.dev.vars`, never in `.env` files. The OpenNext adapter copies `.env` files into the
> deployed Worker. `npm run build:cloudflare` fails if that happens.

Open <http://localhost:3000>.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | Check TypeScript types |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit tests |
| `npm run check` | Run all of the above except dev and start |
| `npm run build:cloudflare` | Build the Worker and fail if a secret is in it |
| `npm run preview:cloudflare` | Run the Worker locally on Cloudflare's runtime |
| `npm run check:size` | Fail if the Worker exceeds its size budget |
| `npm run db:migrate` | Create and apply a migration in development |
| `npm run db:deploy` | Apply pending migrations |

## Documentation

- [Architecture](docs/ARCHITECTURE.md): structure, data flow, and conventions.
- [Deployment](docs/DEPLOYMENT.md): infrastructure, secrets, releases, and rollback.
