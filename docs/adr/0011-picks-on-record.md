# ADR-0011: Picks on record: one signed delegation, picks signed by Hunch's agent, Merkle batches on Sui

- **Status:** Accepted
- **Date:** 2026-11-02
- **Deciders:** Uy ("làm full": the whole happy path)

## Context

- **The happy path's steps 5–8 and 11** (PRD §5, H4, H5): sign in once, put a rule on record, the
  monitor fires while you sleep, a notification with Undo, and a verify page anyone can check.
- **The user signs once,** so Hunch needs a key of its own that signs each pick under the user's
  delegation, and every check has to work without trusting Hunch's database.
- **The anchor module is ready** ([ADR-0010](0010-anchor-module-and-localnet.md)); testnet keys aren't yet.

## Decision

- **Sign-in is the delegation.** `GET /api/auth/challenge` returns the exact text to sign: the address, the
  agent's address, an end date (28 days), at most 20 picks a day, a nonce (10 minutes, single use). The
  server checks the signature with `addressFromSignature` (zkLogin through the Sui client when there is
  one), revokes the address's older delegation, and returns a session token (stored hashed). A visitor's
  rules move to the address.
- **Two ways to sign:** any Sui wallet in the browser (wallet-standard `sui:signPersonalMessage`), or a
  **test key** kept in that browser, labelled "(test)" everywhere.
- **Hunch's agent key** (`HUNCH_AGENT_KEY`, Ed25519) signs each pick's SHA-256 as a personal message.
  `bun run keys:dev` writes a test one into `.env`. Without it, nothing goes on record.
- **A pick on record** is a canonical JSON payload: the rule and version (or "by hand"), the game, the
  side, the confidence, every source's price it saw, the time, the lock, the owner, the delegation and
  the agent. It is refused after lock (409), past the delegation's or the rule's daily limit (429), and
  when that rule (or that person) already picked the game. Undo signs a retraction before lock; both stay
  on the record and an undone pick isn't scored.
- **The monitor** runs every minute over NBA games in the next 24 hours: rules on record, and practice
  rules whose owner signed in. Fresh snapshots only. It logs why a rule did or didn't fire, writing a row
  only when the reason changes.
- **Anchors:** every 10 minutes, or sooner when a pick's game locks within 15 minutes, the pending picks
  and retractions become one Merkle tree (SHA-256, sorted pairs) and its root goes to `hunch::anchor` with
  the sponsor key. A failed batch is retried with the next one.
- **The verify page** (`/p/<id>`, no sign-in) re-runs every check: the hash, the agent's signature, the
  delegation's signature and terms, logged before lock, the Merkle proof, the anchor read back from Sui
  (cached per digest), and anchored before lock. A pick edited in the database fails.
- **BTC rules stay in practice;** NBA rules go on record. Predict trading (P1) is the BTC path.

## Consequences

- **Verified end to end on a localnet on Nov 2:** delegation (a tampered signature is refused), picks by
  hand and by a rule, a duplicate (409), a late pick (409), no session (401), Undo, one batch of 10
  leaves anchored and read back, every check green, and a tampered pick failing.
- **On testnet it waits for** a funded `SUI_SPONSOR_KEY`, `TATUM_API_KEY_TESTNET` and `HUNCH_PACKAGE_ID`
  (`bun run anchor:publish`). Until then picks are signed and wait for their batch.

## Links

[PRD §5, §6.3](../prd.md) · [ADR-0010](0010-anchor-module-and-localnet.md) ·
[ADR-0012](0012-scoring-and-trust-memory.md)
