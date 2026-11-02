# ADR-0012: Scoring, trust memory and the agent's call; Postgres queues every memory line for Walrus

- **Status:** Accepted
- **Date:** 2026-11-02
- **Deciders:** Uy ("làm full": the whole happy path)

## Context

- **Steps 9, 10, 12 and 13 of the happy path** (PRD §5, H7–H10): every voice scored, trust in Walrus
  Memory, an agent's call that leans on it and cites it, Proven, and a learning chart.
- **No Walrus Memory account key is in `.env` yet,** and a write takes about 24 s
  ([tech reference §1.11](../tech-reference.md#111-field-notes-measured-on-mainnet)).
- **`@mysten-incubation/memwal` 0.1.12's types have no `sort` on `recall`,** so "newest first" can't come
  from the relayer.

## Decision

- **Voices:** the books, Polymarket and Kalshi, each rule version and each person. A source is scored on
  every resolved game by its price at lock; a rule or a person by its picks on record. Brier, hit rate
  and a trend (the last 10 against the whole). Weights shrink toward a coin flip with 10 pseudo-games.
- **Trust lines** (`TRUST · voice=… · ctx=NBA moneyline · n=… · brier=… · hit=… · trend=… · as_of=…`) go
  to `trust:public`, one per voice whenever its n changes (the idempotency key). `SPLIT` lines go to
  `radar:public`, `RULE` and `PROVEN` lines to `rules:<address>`, and a `PICK` line per anchored pick to
  `picks:<address>`. Namespaces come from `@hunch/memory`.
- **Postgres queues every line first** (`memories`), then a writer sends them with `rememberBulk` (up to
  20, idempotency key, the shared rate limiter), polls the jobs and stores each blob id. Lines wait while
  there's no key. Nothing private is written.
- **The agent's call** weighs the fresh prices by the newest trust line per source: recalled from Walrus
  Memory when there's a key (retried on empty results with dropped matches), else read from the queued
  copies. The newest line per voice is chosen by its `as_of` and n. Each "leaning on" and "away from" line
  cites its memory id and blob.
- **Proven** is computed per version: n ≥ 20 picks on record and a lower Brier than the `against` source
  on the same games. A `PROVEN` line is written once per n.
- **The learning chart** replays the resolved games in order, weighing each game by the trust earned on
  the games before it: the call against the plain average and the books, cumulative Brier.

## Consequences

- **On Nov 2's backfill (49 games)** the sources sit within 0.006 of each other (Polymarket 0.189, Kalshi
  0.194, the books 0.195), and the call is level with the plain average. The chart says so plainly.
- **With `MEMWAL_ACCOUNT_ID` and `MEMWAL_PRIVATE_KEY` set,** the queued lines go to Walrus Memory on
  mainnet and the citations gain blob ids.

## Links

[PRD §6.4–6.7, §10](../prd.md) · [ADR-0011](0011-picks-on-record.md) ·
[tech reference §1.11](../tech-reference.md#111-field-notes-measured-on-mainnet)
