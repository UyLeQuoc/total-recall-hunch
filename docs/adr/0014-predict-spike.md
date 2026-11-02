# ADR-0014: The Predict spike is a script on testnet, on `@mysten/deepbook-v3` 2.8.0

- **Status:** Accepted
- **Date:** 2026-11-02
- **Deciders:** Uy ("làm nốt đi": finish what's left)

## Context

- **H12 is P0** (PRD §6.8, §7.1): queue one DeepBook Predict order on testnet, see it fill, read its
  settlement, before anyone depends on the path.
- **The PRD names `@mysten/deepbook-v3@2.9.1`,** published Oct 30. Hunch pins dependencies at least two
  weeks old; the newest such release is **2.8.0** (Oct 19).
- **Measured on Nov 2 by diffing the packages:** 2.7.0 and 2.8.0 address the same testnet deployment
  (registry `0x85cf…ccc4`, Predict package `0x0654…e267`). 2.9.1 keeps the registry but points at an
  upgraded Predict package (`0x0e6c…7fc9`), new `predictOrders` and `predictMath`, and keeps the old
  orders package as `predictOrdersV1`.
- **What the SDK really exposes** (`@mysten/deepbook-v3/predict`): `PredictClient({ network, client })`
  over any `ClientWithCoreApi`, so the Tatum `SuiGrpcClient` works; `read.markets`, `read.price`,
  `read.executionMode`, `read.balance`, `read.planMint`, `tx.enqueuePlan`, `decode.enqueue`,
  `read.waitForOutcome` and `read.settlement`. The immediate `mint*` calls are retired by delayed
  execution: orders are queued and filled at Pyth's price.
- **No keys or test USDC yet:** no `TATUM_API_KEY_TESTNET`, no funded `SUI_SPONSOR_KEY`.

## Decision

- **`bun run predict:spike`** (`apps/api/src/ops/predict-spike.ts`), testnet only, every call through
  `@hunch/chain`'s Tatum client:
  1. names the deployment and the execution mode;
  2. lists the open BTC windows soonest first, each with its anchor strike and the up/down price at it
     (`read.price` at `strike: "reference"`): Sui's own BTC price, the `against` for BTC rules;
  3. with `--order` (and `--side up|down`, `--amount` ≥ 1 USDC), plans one mint at the anchor
     (`read.planMint`, order fee on top), refuses outside 0.15–0.85 or when Predict wouldn't accept it,
     queues it (`tx.enqueuePlan`), signs with `SUI_SPONSOR_KEY`, decodes the record id, waits for the
     fill (`read.waitForOutcome`) and polls the settlement.
- **Without `--order` it sends nothing.** Any network but testnet is refused, and keys are never printed.
- **Pinned to 2.8.0.** If the testnet objects refuse calls through the pre-upgrade package, the fix is
  bumping the pin to 2.9.1 once it's old enough (Nov 13), or earlier with the owner's say-so.

## Consequences

- **Not run yet:** it needs the Tatum key, a funded sponsor key and test USDC deposited into a Predict
  account (`tx.deposit`). Until then it stops with a plain sentence saying which is missing.
- **The pure parts are tested** (`predict.test.ts`): arguments, which window may take an order, the
  0.15–0.85 limit, which side a settlement paid.
- **The PRD's "planMint, then enqueuePlan, then waitForOutcome" holds;** in this SDK `planMint` and
  `waitForOutcome` live under `read` and `enqueuePlan` under `tx`.

## Links

[PRD §6.8, §7.1](../prd.md) · [tech reference §3.2](../tech-reference.md#32-deepbook-predict-testnet-the-spike-is-p0-trading-p1) ·
[ADR-0002](0002-sui-grpc-only.md) · [ADR-0003](0003-tatum-for-every-sui-call.md) ·
[ADR-0005](0005-testnet-for-sui-mainnet-for-memory.md)
