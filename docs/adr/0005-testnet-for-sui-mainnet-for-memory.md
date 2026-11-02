# ADR-0005: Sui work runs on testnet; Walrus Memory runs on mainnet; no real money

- **Status:** Accepted
- **Date:** 2026-11-02
- **Deciders:** Uy

## Context

- **Track 1 requires Walrus Memory on mainnet,** with at least 10 memories.
- **Hunch is a testing lab, not a sportsbook** (PRD §13): no deposits, no wagering, no payouts.
- **DeepBook Predict runs on testnet with test USDC.** Mainnet would mean real money.

## Decision

- **Sui: testnet.** `hunch::anchor`, the sponsored anchors, the verify pages and Predict (spike and P1
  trading) all run on testnet.
- **Walrus Memory: mainnet,** on the submitter's account (`MEMWAL_NETWORK=mainnet`), namespaced per user.
- **No mainnet Sui transactions** and no Move publish to mainnet, unless a new ADR says otherwise.
- **Test data is labelled "(test)"** everywhere it shows.

## Consequences

- **Two networks in one process.** Each client names its network; nothing defaults silently.
- **The memory account's delegate key is a mainnet secret.** It lives only in `.env` and the deploy's
  secrets.

## Links

[PRD §10](../prd.md#10-walrus-memory) · [PRD §13](../prd.md#13-safety-trust-and-legal) ·
[event rules](../event-rules.md)
