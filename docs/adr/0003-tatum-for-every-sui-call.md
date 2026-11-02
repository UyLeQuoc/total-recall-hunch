# ADR-0003: Tatum carries every Sui call, paced and counted; polling uses free sources

- **Status:** Accepted
- **Date:** 2026-11-02
- **Deciders:** Uy

## Context

- **Track 1 asks for Tatum's RPC for onchain data,** and judges read how it's used.
- **A free plan is small:** about 100K credits a month at 3 requests a second (PRD §16, unverified for
  Sui). A checkpoint stream spends credits per frame, about 720 frames an hour even when filtered.
- **Tatum's Prediction Market API isn't free:** 100 credits a call, 200 for history.
- **Polymarket, Kalshi and ESPN are free** (PRD §9).

## Decision

- **Every Sui call goes through Tatum:** anchors, verify pages, Predict reads and orders.
- **`PacedTransport`** allows 3 unary calls a second by default, retries Tatum's 429s, and counts calls
  and stream frames by method (`tatumUsage`).
- **Polling never uses Tatum.** Prices and scores come from the free sources, paced and cached.
- **The Prediction Market API is off by default.** With a paid plan, it may cross-check resolutions for
  events with picks, at most 20 calls a day.
- **The credit meter** (PRD H11) stores usage by method and day, and a daily budget (2,000 credits by
  default) pauses non-essential reads first. Anchors keep priority.

## Consequences

- **The budget fits a free plan:** about 8,000 calls and 16,000 credits over the build (PRD §11).
- **The README lists every Tatum call and the budget** (PRD §14, Nov 8).

## Links

[ADR-0002](0002-sui-grpc-only.md) · [ADR-0004](0004-public-fullnode-fallback-on-402.md) ·
[PRD §11](../prd.md#11-sui-and-tatum)
