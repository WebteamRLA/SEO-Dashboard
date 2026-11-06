# Central Organic Dashboard

A central dashboard for RightLeft Agency (RLA) covering SEO work, roadmaps, leads, revenue, traffic,
site health, and reports.

**Current state: Step 1, frontend only.** Every page is built, and all figures are sample data. There
is no database, authentication, or external integration yet.

## Getting started

Requires Node.js 24.

```bash
npm install
npm run dev
```

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

## Documentation

- [Architecture](docs/ARCHITECTURE.md): structure, data flow, and conventions.
