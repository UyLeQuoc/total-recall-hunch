# ADR-0004: When Tatum answers 402, Sui calls go to the public fullnode for a cool-down

- **Status:** Accepted
- **Date:** 2026-11-02
- **Deciders:** Uy

## Context

- **A spent plan answers HTTP 402** to every gRPC call and stream. grpc-js reports it as `UNKNOWN`, with
  the status in the message.
- **Tatum's team told hackathon teams** that judges won't penalize running out of free credits, as long
  as the README and the submission say what happened and route through public endpoints meanwhile.
- **`fullnode.<network>.sui.io:443` answers native gRPC,** streams included, with no key.

## Decision

- **Tatum stays the primary.** `FallbackTransport` (`@hunch/chain`) wraps the paced Tatum transport.
- **A unary call refused with 402 is sent again to the fallback.** The gateway refused it, so nothing ran,
  and even `ExecuteTransaction` is safe to resend.
- **Calls go straight to the fallback for 10 minutes,** then Tatum gets the next call again. A topped-up
  or replaced key takes over with no restart.
- **A stream's 402 arrives after it opens.** Its owner reconnects after a backoff, and that open goes to
  the fallback.
- **`SUI_GRPC_FALLBACK` and `SUI_GRPC_FALLBACK_TESTNET`** take a gRPC URL, or `off`. Unset means the
  public fullnode.
- **The fallback's calls don't count as Tatum usage.** `suiFallback(network)` says since when and how many
  calls went there, for health.
- **If it happens, the README and the submission say so.**

## Consequences

- **The app stays up while a plan is spent.**
- **The public fullnode has its own rate limits.** At 3 calls a second per process, the load stays small.
- **One call per 10 minutes is wasted on Tatum** while the plan is spent.

## Links

[ADR-0003](0003-tatum-for-every-sui-call.md) · `packages/chain/src/fallback.ts`
