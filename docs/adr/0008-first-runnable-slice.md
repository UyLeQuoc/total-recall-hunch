# ADR-0008: The first runnable slice: an API and a web app, NBA and BTC first, on real data

- **Status:** Accepted
- **Date:** 2026-11-02
- **Deciders:** Uy ("make the project run, the happy path")

## Context

- **Until now the repo had docs and two packages, nothing to run.** [ADR-0001](0001-repo-stack-and-layout.md)
  named `apps/api` (Hono) and `apps/web` (React) as next.
- **The happy path's first value is the replay and a scored pick** (PRD §5, steps 1–4). Both can run on
  free data today, with no keys.
- **The free sources answer from our machine** (probed Nov 2): ESPN's scoreboard (DraftKings moneylines
  before a game, finals after) and its `summary` (DraftKings closing lines for past games), Polymarket's
  game markets by slug (`nba-<away>-<home>-<US Eastern date>`) and `prices-history`, Kalshi's
  `KXNBAGAME` events and 1-minute candlesticks, Coinbase's BTC ticker and candles.
- **No keys are in `.env` yet:** no model, Tatum, sponsor, anchor package or Walrus Memory account.
- **Measured gaps, 49 finished games, 30 minutes before tip-off:** the books and Polymarket were at most
  4.1 points apart (most under 2); Kalshi and Polymarket at most 1. The PRD's "5+ points" hunch never
  fired in the week.

## Decision

- **`apps/api`:** Bun, Hono 4.13.13, `postgres` 3.4.9 and zod. Domain folders per the code rules:
  `ingest/` (sources, backfill, the board, health), `compiler/` (the rule schema, the compilers, the card),
  `monitor/` (evaluate, replay, practice picks, the loops), `score/`, `routes/`. The schema is created at
  start (`create table if not exists`).
- **`apps/web`:** Vite 8, React 19, Tailwind 4, shadcn (new-york, neutral; `@/lib/utils` keeps `cn`),
  `wouter` 3.13 for three routes, `lucide-react`. Dev server on port 5290, proxying `/api` to 8787.
  `bun run dev` runs both; `bun run db:up` first.
- **Scope of the slice:** NBA moneylines and BTC over 5 minutes. Elections and the EPL come with their
  ingest. What runs: H1 (compile), H2 (the card, practice only), H3 (replay), H4 for BTC practice picks,
  H6 (all four free sources), H7 without the agent's call, H8 for practice picks, H11 (status). Not yet:
  sign-in and delegation, anchors and verify (H5), trust memory (H9), Proven (H10), the Predict spike (H12).
- **The compiler:** the model through OpenRouter when `OPENROUTER_API_KEY` is set, validated by the zod
  schema. Without a key, or when the model fails, a deterministic pattern compiler handles the example
  shapes (a split between two sources; a BTC move). The card says which one compiled it.
- **The replay's week is backfilled once per game:** ESPN finals and DraftKings closing lines, plus
  Polymarket and Kalshi prices for the 3 hours before tip-off; BTC 5-minute candles from Coinbase. Only
  the replay may read a closing line, and it says how many fires did. The live evaluator reads fresh
  snapshots only.
- **"See one scored now":** a BTC practice pick that BTC keeps its last 5-minute direction, with that
  pattern's 7-day hit rate as its confidence, scored by the first Coinbase price after 5 minutes.
- **The examples use 2+ points** for the NBA splits (books vs Polymarket; Kalshi vs the books), from the
  measured gaps. A 5+ hunch still compiles; its replay shows 0 fires.
- **Biome's `noThenProperty` is off** for `apps/api/src` and the web's hunch schema: the PRD's rule has a
  `then` array, never a function, so it is never a thenable.

## Consequences

- **`bun run db:up && bun run dev` gives a working site** at `http://localhost:5290` with no keys.
- **The first backfill takes about a minute** (about 250 paced calls) and runs hourly after.
- **Next:** sign-in and the delegation, `hunch::anchor` and the verify page, the monitor for rules on
  record, sports scoring and trust memory, then Proven.

## Links

[PRD §5, §7, §9](../prd.md) · [ADR-0001](0001-repo-stack-and-layout.md) ·
[ADR-0009](0009-the-look.md) · [code rules](../code-rules.md)
