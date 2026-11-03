# Product feedback: one sentence starts the whole loop

| Field      | Value                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------ |
| **Date**   | Nov 3, 2026                                                                                            |
| **From**   | Harry Phan (review of the live demo and of `main` at `7556db7`)                                        |
| **Status** | Proposed. Nothing here is decided until the owner accepts it; each accepted change gets an ADR (AGENTS.md) |

**The user only says a hunch. Hunch tests it and keeps following it.** Nobody should have to understand
a "rule", turn on a monitor, pick a mode or manage an agent. Keep the clean prompt column and the ASCII
look ([ADR-0009](adr/0009-the-look.md)). What needs to grow is what the product does after one sentence.

The strongest line for the hackathon:

> **Say a hunch. Hunch tests it, follows what happens next, and remembers what it learns.**

This is a product proposal based on the demo and the code. It describes the behaviour to reach; not all
of it exists today. Section 11 is a separate list of defects found in the code review.

## 1. One sentence starts the whole experience

The user types:

> "When the books and Polymarket disagree on NBA, the books are right."

Hunch does four things on its own:

1. Understands the hypothesis and restates how it will be tested (H1, H2).
2. Tests it on history (H3).
3. Finds the next games that match (H4, H6).
4. Keeps updating the evidence as results come in (H8, H10).

The user never chooses "Create rule", "Enable", "Practice" or "Monitor". Those ideas can live inside the
system. The first answer reads:

```text
The books beat Polymarket on NBA disagreements.

PAST       4 of 6 picks right · early evidence
NEXT       Watching upcoming NBA games
LEARNED    Not enough evidence to trust this yet

[details]
```

Every line comes from real data. "Watching" appears only once the follow has actually been saved.

**Done when:** one sentence gives a result and says what Hunch will do next, with no setup step.

## 2. Follow automatically, but keep watching apart from signing

Start following a hunch the moment it is sent. Following is observing and scoring: no bet, no money.

| The user is                    | Hunch does on its own                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------- |
| Not signed in                  | Keeps the hunch in the visitor session, replays it, watches its conditions, logs observations and results |
| Signed in with a valid delegation | Also signs picks and builds proofs, within the scope the user allowed (H5)               |

Don't ask a visitor to sign before they see the value. If they want a record tied to their wallet, ask
for the delegation once, at the right moment, then run within it.

The honest line: **a visitor's automatic observation is never shown as a pick signed under their
delegation.**

One small action, "Stop following", is enough. No rule management screen.

## 3. After the replay, answer "what happens next?"

This gap matters more than any layout change. After the replay, Hunch finds and says one of:

```text
Next check: PHI @ DET, 30 minutes before tip-off.
```

```text
No upcoming game matches yet. Hunch is watching.
```

```text
Waiting for a fresh books price before making a call.
```

The user never reads a condition log, only one accurate sentence about what Hunch is doing. When a
matching event comes, it joins the same hunch:

```text
New observation
DET · Books 53% / Polymarket 49%
Your hunch favours DET.
Recorded before tip-off.
```

**For the demo:** one sentence starts a process that keeps going, instead of a report that ends.

## 4. "Memory learns" must change a decision you can see

This is where to invest the most. The demo already has trust scores and memory, but the viewer has to
work out how they relate. Show one concrete chain:

**new result → a source's score changes → a memory is written → the next call reads that memory** (H8, H9).

It belongs right under a call, not on the Learning page:

```text
Hunch leans toward Polymarket here.

It has scored better on recent NBA predictions.
Based on 63 resolved games.

[why this call]
```

Opening "why this call" shows:

1. Which sources were used.
2. Each source's score and sample size.
3. The memories that were read.
4. When each memory was written.
5. The call with trust weights next to the call with a plain average.

**Keep two kinds of decision apart:**

1. **The user's hypothesis:** always follow the books under the agreed condition.
2. **Hunch's judgement:** from the evidence today, it may lean toward Polymarket.

Hunch never quietly rewrites the user's hypothesis to "learn better". It can say:

> "Your hunch favours the books. Hunch's current evidence favours Polymarket."

That is the depth: **Hunch helps the user test what they believe, even when the evidence disagrees.**

## 5. Show the learning without overstating it

A memory dump does not prove learning, and a tiny improvement does not prove Hunch got smarter. The demo
picks one real, traceable example:

| Before                                 | New evidence                         | After                            |
| -------------------------------------- | ------------------------------------ | -------------------------------- |
| Not enough data to prefer a source     | More finished games, scored          | Trust is updated                 |
| The call uses the old weights          | The new memory is saved and read back | The next call uses the new weights |

If the call comes out the same, say so:

> "Memory was updated. It did not change this call."

That still proves the integration works, and it is more believable than calling every update "AI
improved".

**Done when:** from one call, a viewer can trace back to the memory and to the results that wrote it.

## 6. The proof is a property of the pick

No separate "Create proof" flow. A valid pick is, on its own (H5):

1. Written with its payload and time.
2. Signed.
3. Put in a batch.
4. Anchored on Sui.
5. Read back and verified.
6. Updated in place on the pick.

The user sees very little:

```text
Before tip-off ✓
Signed ✓
Sui proof pending…
```

Then:

```text
Verified on Sui ✓
[verify]
```

The technical checks and their sources open behind "verify".

**For the hackathon:** this is where Tatum plays a real part. The demo reads the proof back from the
chain; a transaction link alone is not the proof.

If the anchor lands after the lock, say so. "Anchored" and "anchored before the event locked" are two
different proofs.

## 7. A hunch's results add up to a story

A returning user should not hunt for single picks and add them up. Reopening a hunch says:

```text
Since you asked:
3 new picks resolved.
Your hunch was right twice.

Still too early to tell whether it beats Polymarket.
```

From the same place they can open:

1. Every result, losses included.
2. The historical replay, apart from live observations.
3. The comparison on the same games.
4. Each pick's proof.
5. What Hunch learned.

No new dashboard: one hunch with its history is enough.

**What matters:** "4 of 6 right" does not mean "beats the market". Hunch states the conclusion at the
strength the evidence allows (H10), instead of leaving the user to read it from a win rate.

## 8. BTC is its own quick path, not a detour from NBA

BTC helps the demo because it resolves in five minutes, but sending someone who is testing an NBA hunch
over to BTC breaks the logic.

1. An NBA hunch keeps following NBA.
2. A Senate hunch keeps following the Senate.
3. A separate example: **"Try a five-minute BTC hunch."**

BTC must be scored on the real five-minute window, even when the worker runs late. Otherwise the speed
costs the feature its credibility.

For a 2 to 3 minute demo, show **one existing, verified record** for the full result and start one new
hunch live. Label which is the earlier record and which just started.

## 9. Minimal still holds when the data doesn't cooperate

| Situation                    | Behaviour                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| The hunch is ambiguous       | Ask one question, only if the readings would test different things (H1)            |
| It isn't supported           | Say what is in scope and offer the closest wording that can be tested              |
| There is no history          | Build no result; start following from now                                          |
| A source is missing          | Say which one; draw no comparison                                                  |
| No game matches yet          | Keep waiting and say what it is waiting for                                        |
| A price is stale             | Make no pick from it                                                               |
| Memory can't be read         | Say a fallback is in use; don't claim the call rests on memory                     |
| The chain hasn't verified    | Stay pending and retry on its own                                                  |
| The user edits the hunch     | Keep the old history and start a new version; never rewrite results (H2)           |
| The user leaves the page     | What was saved keeps running on the server                                         |

This is the depth that has to sit behind one minimal screen.

## 10. Order of work

Walrus and Tatum integration and technical quality are 30% each of the score
([event rules §7](event-rules.md)). So:

**First:**

1. [ ] One sentence → replay → following on its own, with no rule to turn on.
2. [ ] The same hunch carries through from hypothesis to result.
3. [ ] At least one real pick whose proof is read back through Tatum.
4. [ ] A chain of result → memory on Walrus → that memory used in the next call.
5. [ ] Replay, live observation, signed pick and proof before lock are clearly told apart.
6. [ ] Results keep every loss and don't change when the worker runs late.
7. [ ] One complete record a viewer can explore straight away.

**Then:**

1. [ ] "What's new since last time" is summarised on its own.
2. [ ] From **tonight**, a real situation can be turned into a hunch.
3. [ ] The evidence opens in place, under the call.
4. [ ] The missing data, pending and recovery cases in §9 are finished.

**Trading and more markets wait until after this round.** They add scope but prove the core story less
well than one complete hunch does.

### The demo flow

1. **Type an NBA hunch live.** Hunch understands it, replays it and starts following it.
2. **Open a hunch with real history.** Its picks were recorded before the event, and a loss is still there.
3. **Open the proof.** Verify it on Sui through Tatum.
4. **Open the next call.** Show which Walrus memory moves the weights, and why.
5. **End on the conclusion.** What the user learned, and what Hunch is still following.

Keep the minimalism: one sentence, one result that lives on over time, the evidence open when it is
needed. The depth is in the test, prove and learn loop, not in more buttons or screens.

## 11. Fixes found in the code review

A static read of `main` at `7556db7`; none of the repo's checks were run for it. Paths are from the repo
root. Security-sensitive findings are left out of this public doc and go to the owner directly.

**Fix now (they touch the record being built today):**

1. [ ] **Verify fails for Slush (zkLogin) users.** `apps/api/src/anchor/verify.ts:75` calls
   `addressFromSignature` without a Sui client, which `packages/memory/src/wallet.ts:28` says zkLogin
   needs (`auth/service.ts:63` passes it). Every Slush pick's public proof says "the delegation doesn't
   cover this pick". Pass the client in, and cache the result per delegation.
2. [ ] **Undo doesn't stick for rule picks.** `apps/api/src/monitor/record.ts:109` skips retracted picks
   in its "already picked" check, so the next tick signs a new pick on the same game. Skip any
   (rule, version, event) that has a pick at all.
3. [ ] **Duplicate picks.** `apps/api/src/monitor/signed.ts:48 to 98` counts, then inserts, with no
   transaction and no unique index, and the "Log it on record" button
   (`apps/web/src/features/games/research-card.tsx:122`) stays enabled while it saves. A double click
   gives two signed, anchored picks on one game. Use one transaction plus partial unique indexes, and
   disable the button while busy.
4. [ ] **Polymarket guesses the home side.** `apps/api/src/ingest/polymarket.ts:39 to 41` falls back to
   outcome 1 when no name matches, which can store the away price as the home price. Refuse instead
   (PRD §8).
5. [ ] **Hand picks after tip-off.** `apps/api/src/monitor/manual.ts:19 to 22` checks only
   `now < starts_at`, not `status = 'pre'` as the monitor does (`record.ts:94`).
6. [ ] **Anchor retries.** `apps/api/src/anchor/batcher.ts:67 to 90` retries a failed batch every minute
   with no backoff or budget check, never re-queues a batch left `pending` by a crash, and can anchor
   twice if the transaction landed before an error. Back off, check the meter, and look up the digest
   before resubmitting.
7. [ ] **The 402 check is too broad.** `packages/chain/src/fallback.ts:26` matches any message with
   "402" in it. Match only `HTTP status code 402` or `plan limit exceeded`.

**Before submission:**

1. [ ] A second Undo overwrites an anchored retraction (`apps/api/src/monitor/signed.ts:145`): add
   `and retracted_at is null`.
2. [ ] Wallets that register after first paint never show (`apps/web/src/lib/wallet.ts:24`): listen to
   `getWallets().on("register")`.
3. [ ] A 401 from `/api/auth/me` is swallowed (`apps/web/src/hooks/use-session-check.ts:18`), so a stale
   account still looks signed in.
4. [ ] The game row can't be opened from the keyboard (`apps/web/src/features/games/games-page.tsx:82`).
5. [ ] `--ink-3` on the light background is about 3.0:1 (`apps/web/src/index.css:57`), under WCAG AA.
6. [ ] The verify page doesn't re-poll while pending, and the digest has no explorer link
   (`apps/web/src/features/verify/`).
7. [ ] The PRD header still reads "Ready to build" (`docs/prd.md:7`), and the README has no Submission
   section (video, blog, Tatum ID, the Walrus Memory account for the 10 or more mainnet memories).
8. [ ] CI builds neither the web app nor the Docker image (`.github/workflows/ci.yml`).

**Later:**

1. [ ] The rule schema accepts rules that can never fire (`apps/api/src/compiler/rule.ts:14 to 65`).
2. [ ] Two concurrent "Put on record" requests write two RULE memory lines (`compiler/lifecycle.ts:54`).
3. [ ] Verify ignores who sent the `Anchored` event (`apps/api/src/anchor/verify.ts:119`).
4. [ ] Backfill marks games done even when every source failed (`apps/api/src/ingest/nba.ts:137`).
5. [ ] `fires` grows by about one row per rule per event per minute (`apps/api/src/monitor/record.ts:79`).
6. [ ] `scripts/scan-history.ts:32` ignores git's exit status and can report clean on failure.
7. [ ] The API image installs the web app's dependencies too (`apps/api/Dockerfile:5`).
