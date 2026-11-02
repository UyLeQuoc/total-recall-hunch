# ADR-0015: `bun run localnet` runs the whole on-record path on one machine

- **Status:** Accepted
- **Date:** 2026-11-02
- **Deciders:** Uy ("giờ xài được E2E chưa … để tôi test")

## Context

- **Picks on record need an anchor on Sui** ([ADR-0011](0011-picks-on-record.md)), and the testnet keys
  aren't in `.env` yet. Without them a pick is signed but its verify page stays "pending".
- **[ADR-0010](0010-anchor-module-and-localnet.md) already tests the anchor path on a localnet** through
  `SUI_LOCALNET_GRPC`; doing that by hand takes six steps.
- **A batch every 10 minutes** is right for testnet's credit budget, and too slow to try by hand.

## Decision

- **`bun run localnet`** starts `sui start --with-faucet --force-regenesis` with its own config in
  `.localnet/` (gitignored, never `~/.sui`), funds a fresh test key from the local faucet, publishes
  `hunch::anchor`, and writes a marked block into `.env`: `SUI_LOCALNET_GRPC`, that test
  `SUI_SPONSOR_KEY`, `HUNCH_PACKAGE_ID` and `ANCHOR_EVERY_MIN=1`. Ctrl-C stops the localnet and removes the
  block; a new run replaces a stale one.
- **`ANCHOR_EVERY_MIN`** (default 10) sets the batch interval. Batches still go early before a lock.
- **Restart `bun run dev` after it starts,** so the API reads the block.

## Consequences

- **The whole happy path runs locally:** sign in with a test key, put a rule on record or pick by hand,
  Undo, a batch anchored within a minute, and a verify page that reads the anchor back from Sui.
- **It is test only:** the key, the package and the anchors vanish with the localnet. Testnet still needs
  the owner's funded `SUI_SPONSOR_KEY`, `TATUM_API_KEY_TESTNET` and `bun run anchor:publish`.

## Links

[ADR-0010](0010-anchor-module-and-localnet.md) · [ADR-0011](0011-picks-on-record.md) ·
[README](../../README.md#develop)
