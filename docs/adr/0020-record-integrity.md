# ADR-0020: The record can't be changed by a double click, an Undo or a retry

1. **Status:** Proposed
2. **Date:** 2026-11-04
3. **Deciders:** Harry Phan proposes; the owner accepts by merging

## Context

Proven and every proof rest on the record: one pick per game, made before lock, that stays as it was made. A code review on Nov 3 found ways it could break:

1. Undo on a rule pick didn't stick. The monitor ignored retracted picks, so its next tick signed a new one while the condition held.
2. Pick creation counted, then inserted, with no transaction or unique index. Two requests at once made two signed, anchored picks and could pass the daily limit.
3. Two Undo requests at once could overwrite a retraction that was already anchored.
4. Hand picks checked the listed start time but not whether the game had already started.
5. Polymarket's home side was guessed as outcome 1 when no name matched, which could store the away price as the home price.
6. The verify page checked a delegation without the Sui client zkLogin needs, so every Slush proof read "failed".
7. A failed anchor retried every minute without end, and a batch left pending by a crash held its picks forever.

No test touched Postgres, so none of this could have been caught.

## Decision

1. **Undo is final for a rule.** The monitor skips any (rule, version, event) that already has a pick, undone or not. A person can still pick a game by hand again after undoing their own pick.
2. **One pick per game is enforced in Postgres.** Pick creation takes a per-address advisory lock in one transaction, and two partial unique indexes back it up. Existing duplicates don't stop the API from booting: the index is skipped, and the lock still holds.
3. **Undo writes only once,** and a second one answers 409.
4. **Hand picks need `status = 'pre'`.**
5. **Polymarket is refused, not guessed,** unless exactly one outcome matches the home team (PRD §8). Refusals are logged.
6. **Verify passes the Sui client,** and caches each confirmed signer in memory. A zkLogin signature that can't be re-checked reads "pending", not "failed", because the read can be over budget or fail, and the signature's proof may have expired since. It was checked at sign-in.
7. **Failed anchors back off:** 2, 4 and 8 minutes, then every 15. A batch pending for 15 minutes is released. Anchors are **not** gated on the daily credit budget, because PRD §16 says the budget cuts reads first. A second anchor of the same picks costs gas and harms nothing, so it is accepted over losing a proof.
8. **CI runs Postgres.** Tests that need it use `HUNCH_TEST_DATABASE_URL`, must name a test database, and each file gets its own schema.

## Consequences

1. A rule that was undone won't pick that game again, even if the user changes their mind. They can pick it by hand.
2. A long failure delays anchors by up to 15 minutes, so a pick made close to lock may be anchored after it. Verify already says so.
3. `/verify` on a Slush pick makes one Tatum call per delegation until the API restarts.
4. Bad Polymarket prices already stored aren't repaired. The next snapshot simply won't add one.
5. Nothing takes effect until this is merged and deployed, and the indexes are created at the first boot after that.

## Links

1. [PRD §8, §13, §16](../prd.md)
2. [ADR-0011](0011-picks-on-record.md)
