# ADR-0001: One Bun monorepo, with the chain and memory packages the team already tested

- **Status:** Accepted
- **Date:** 2026-11-02
- **Deciders:** Uy ("create a new repo for Hunch, bring over the files it needs, with docs")

## Context

- **Hunch is a Track 1 entry** ([PRD](../prd.md)), with eight days to the deadline (Nov 10, 17:00 UTC).
- **The team already has tested, MIT-licensed code** for the two hardest integrations:
  - Sui over Tatum's native gRPC, paced, metered, and falling back to the public fullnode on 402;
  - Walrus Memory: the relayer's rate limit, account and delegate reads over gRPC, sponsored account
    set-up, wallet sign-in, redaction, untrusted recall.
- **The PRD's stack** (§12) is Bun, Hono, React and Postgres, a Move package, `@mysten/sui`,
  `@mysten/deepbook-v3` and `@mysten-incubation/memwal`.

## Decision

- **One Bun monorepo:** Bun 1.3.14, Turbo, Biome, strict TypeScript, Vitest. Workspaces are `apps/*` and
  `packages/*`.
- **Two packages are copied in, not depended on:**
  - `@hunch/chain`: the Tatum client ([ADR-0002](0002-sui-grpc-only.md),
    [ADR-0003](0003-tatum-for-every-sui-call.md), [ADR-0004](0004-public-fullnode-fallback-on-402.md)) and
    the logger;
  - `@hunch/memory`: Walrus Memory, with Hunch's namespaces (PRD §10).
- **What comes next** (PRD §12, §14):
  - `packages/move/hunch` (`hunch::anchor`);
  - `apps/api` (Hono: the API, plus the monitor, ingest, resolver and anchor batcher as worker loops);
  - `apps/web` (React).
- **Postgres** runs in `docker-compose.yml` on port 5437 (`bun run db:up`).
- **Logs** are JSON lines. Every line inside a request or a job carries its `requestId` or `jobId`
  (`withLogContext`), and secrets never reach the output.
- **Decisions are ADRs,** in the same commit as the change. The docs index is
  [docs/README.md](../README.md).
- **The history starts fresh.** Nothing else's history comes along.

## Consequences

- **Day one starts on Hunch's own code,** not on transports and relayer quirks.
- **The copies are Hunch's to change.** A fix made elsewhere is ported by hand, if at all.
- **CI runs lint, the link check, typecheck, tests and a dependency audit,** and `sui move test` once
  `packages/move/hunch` exists.

## Links

[PRD](../prd.md) · [code rules](../code-rules.md) · [tech reference](../tech-reference.md)
