# ADR-0010: `hunch::anchor` emits one event per batch; a localnet for tests; testnet waits for the owner's keys

- **Status:** Accepted
- **Date:** 2026-11-02
- **Deciders:** Uy ("làm full": the whole happy path)

## Context

- **Picks on record need a proof on Sui** (PRD §6.3, H5): a Merkle root per batch, with the time from the
  `Clock`, that anyone can read back through Tatum's gRPC.
- **Nothing else needs state on chain.** The picks, the leaves and the proofs live in Postgres; the
  verify page reads the anchor transaction by its digest (`GetTransaction`), which Hunch already knows.
- **No keys are in `.env` yet:** no funded `SUI_SPONSOR_KEY`, no `TATUM_API_KEY_TESTNET`. The anchor path
  still has to be tested end to end before they arrive.
- **The Sui CLI (1.82.1) runs a localnet** with a faucet, and its fullnode serves native gRPC on
  `127.0.0.1:9000`, the same API Tatum serves.

## Decision

- **`hunch::anchor::anchor(root, count, clock, ctx)`** checks the root is 32 bytes and the batch isn't
  empty, then emits `Anchored { root, count, timestamp_ms, by }`. No shared object, no stored state:
  one event per batch, read back with `GetTransaction` and parsed from the event's BCS.
- **`apps/api/src/anchor/chain.ts`** submits an anchor (`submitAnchor`), reads one back (`readAnchor`),
  and publishes the package (`publishPackage`). The signer pays its own gas.
- **`anchorClient(env)`** picks the Sui client: a localnet when `SUI_LOCALNET_GRPC` is set (tests only,
  `createLocalSuiClient` in `@hunch/chain`, insecure gRPC, refuses any host but this machine, not
  metered), otherwise Tatum on testnet when `TATUM_API_KEY_TESTNET` is set
  ([ADR-0003](0003-tatum-for-every-sui-call.md)), otherwise none, and anchors wait.
- **`bun run anchor:publish`** builds the package (`--build-env testnet`) and publishes it with
  `SUI_SPONSOR_KEY`, on testnet through Tatum or on a localnet. It never targets mainnet
  ([ADR-0005](0005-testnet-for-sui-mainnet-for-memory.md)) and never prints the key.
- **The testnet publish waits for the owner:** a funded `SUI_SPONSOR_KEY` and a Tatum key. Then
  `HUNCH_PACKAGE_ID` goes in `.env`.

## Consequences

- **Verified on a localnet on Nov 2:** publish, anchor and read back with a fresh test key funded by the
  local faucet; the root, the count and the sender round-trip, and a digest with no anchor reads as
  "not found" or "no Hunch anchor", never as a pass.
- **`sui move test`** covers the happy path and both aborts; CI runs it now that `Move.toml` exists.
- **To test locally:** `sui start --with-faucet --force-regenesis` with `SUI_CONFIG_DIR` pointing at a
  scratch directory (so the user's own Sui config is never touched), fund a fresh key, set
  `SUI_LOCALNET_GRPC=http://127.0.0.1:9000`.

## Links

[PRD §6.3, §11](../prd.md) · [ADR-0002](0002-sui-grpc-only.md) ·
[ADR-0003](0003-tatum-for-every-sui-call.md) · [tech reference §2.2](../tech-reference.md)
