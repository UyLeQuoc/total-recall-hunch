# ADR-0016: The API runs on Railway, the web on Vercel at testyourhunch.vercel.app

- **Status:** Accepted
- **Date:** 2026-11-03
- **Deciders:** Uy ("deploy lên railway đi, FE lên vercel, lấy domain đẹp vercel.app")

## Context

- **The submission needs a working demo** at a public URL (PRD §1.1), and the owner gave the go to deploy
  (AGENTS.md).
- **The API is a long-running Bun process** with worker loops (ingest, monitor, anchors, the memory
  writer) and Postgres. The web is a static Vite build that calls `/api`.
- **Every key is now set:** Tatum testnet, the sponsor, `hunch::anchor` on testnet, Walrus Memory on
  mainnet, The Odds API and OpenRouter.

## Decision

- **API on Railway** (project `hunch`, service `hunch-api`): built from `apps/api/Dockerfile` at the repo
  root (`RAILWAY_DOCKERFILE_PATH`; Bun 1.3.14, production dependencies only), with Railway's Postgres over
  private networking (`DATABASE_URL=${{Postgres.DATABASE_URL}}`). Health check `/api/health`. Public URL:
  `https://hunch-api-production-da65.up.railway.app`.
- **Web on Vercel** (project `testyourhunch`, root `apps/web`): `https://testyourhunch.vercel.app`.
  `apps/web/vercel.json` rewrites `/api/*` to Railway, so the browser stays on one origin (no CORS) and the
  hunch stream (SSE) passes through; every other path serves `index.html`.
- **Secrets:** set as Railway variables from `.env`, never in the repo. `.vercelignore` keeps `.env`,
  `.env.*` and `.localnet` out of Vercel uploads (the CLI doesn't skip `.env` by itself).
- **The first database is a copy of the local one,** made once through a temporary TCP proxy (deleted
  right after), so lines already written to Walrus Memory aren't written twice: memories can't be
  deleted.
- **Only one instance runs with the production keys.** A local `bun run dev` with the same `.env` would
  anchor and write memory twice; run it without those keys, or stop it.
- **Deploys are by hand for now:** `railway up --service hunch-api` and `vercel deploy --prod` from the
  repo root. Deploying on every push to `main` is a later decision.
- **The trust recall is served from cache and refreshed in the background** every minute, so a page never
  waits on Walrus.

## Consequences

- **The demo is public;** the hackathon form gets `https://testyourhunch.vercel.app`.
- **The API keeps running overnight,** so rules on record fire before tip-off and the polls close.
- **Railway and Vercel bill the owner's accounts.**

## Links

[ADR-0006](0006-mit-private-until-submission.md) · [ADR-0015](0015-local-end-to-end.md) ·
[README](../../README.md)
