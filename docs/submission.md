# Submission: Walrus × Tatum "Total Recall"

Every field of the form at [recall-tatum-walrus.vercel.app](https://recall-tatum-walrus.vercel.app),
ready to paste ([event rules §4](event-rules.md)). Fields marked _fill in_ are personal and stay out of
this public repo. The deadline is **Nov 10, 2026, 17:00 UTC**.

## Checklist (event rules §5.1)

| Requirement                               | Status                                                                                    |
| ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| Walrus Memory integrated, writing on mainnet | ✅ 110 lines written (Nov 4)                                                           |
| At least 10 memories on mainnet           | ✅ 110                                                                                     |
| Tatum RPC for onchain data                | ✅ Every Sui call over Tatum's gRPC gateway; 8 anchor batches on testnet                   |
| Working demo and public repo              | ✅ https://testyourhunch.vercel.app · https://github.com/UyLeQuoc/total-recall-hunch       |
| Short demo video (2–3 min)                | ✅ https://youtu.be/gHsQ5GAh2VE (2:00)                                                     |
| Published blog post                       | ⏳ Draft in [blog.md](blog.md): publish it, then paste its URL below                       |

## The form

| Field                                                   | Answer                                                               |
| ------------------------------------------------------- | -------------------------------------------------------------------- |
| Email                                                   | _fill in_                                                            |
| Discord handle                                          | _fill in_                                                            |
| LinkedIn                                                | _fill in_                                                            |
| Telegram ID _(optional)_                                | _fill in_                                                            |
| How did you hear about this event?                      | _pick one_: Walrus Socials, Tatum Socials, Ads, Hackathon Listings, Friends, Search, Others |
| Which community or account did you hear about us through? _(optional)_ | _fill in_                                             |
| Is this your first Web3 project?                        | _Yes / No_                                                           |
| **Tatum ID**                                            | _fill in_: dashboard.tatum.io → My Account → My Account Info         |
| **SUI address**                                         | _fill in_: the submitter's wallet                                    |
| **Account ID (SUI)**                                    | `0x183c52e8b1f698f685c7f190f7204ea32e0339b130c5fc1042273632d0817641` |
| **MEMWAL_AGENT_ID**                                     | `984413233c953f7181e56d6b9e9a6f3b5ebe1359761571fcef8daff41683dc06`   |
| Project description                                     | See [below](#project-description)                                    |
| Short demo video                                        | https://youtu.be/gHsQ5GAh2VE                                         |
| GitHub repo                                             | https://github.com/UyLeQuoc/total-recall-hunch                       |
| How was your experience building with Walrus?           | See [below](#experience-with-walrus)                                 |
| How was your experience building with the Tatum AI Builder? | See [below](#experience-with-the-tatum-ai-builder)               |
| Additional documentation _(optional)_                   | _The blog post's URL_, plus https://github.com/UyLeQuoc/total-recall-hunch#readme |
| One bug or friction point with Walrus Memory _(optional)_ | See [below](#one-friction-point-with-walrus-memory)                |
| Social post links _(optional)_                          | _The X / LinkedIn post URLs_                                         |
| Checkbox                                                | Tick it: 18+, Event Rules, Tatum Terms, Walrus ToS and Privacy Policy |

The Account ID is the `MemWalAccount` object on Sui mainnet. `MEMWAL_AGENT_ID` is the public key of the
delegate key Hunch writes with. Both are public, onchain identifiers.

## Project description

> **Hunch: test your hunch before you bet. Track 1, Markets & Sports Prediction.**
>
> Everyone who bets or forecasts has hunches, like "Polymarket overprices NBA favourites" or "the books are
> sharper than Kalshi". Almost nobody tests them honestly. Hunch works in four steps:
>
> 1. You say the hunch in plain words, and a model compiles it into a typed rule you can read.
> 2. Hunch replays the rule on 7 days of stored prices from the sportsbooks, Polymarket and Kalshi.
> 3. Then it puts the rule on record. Every pick is hashed, signed under your delegation, batched into a
>    Merkle root and anchored on Sui through Tatum's gRPC gateway before lock. No loss can be hidden, and
>    anyone can verify a pick on its proof page.
> 4. Every morning every voice is scored: your rule, the books, Polymarket, Kalshi. Walrus Memory on
>    mainnet keeps who was right, on what. The agent's call is weighted by those memories and cites their
>    blobs.
>
> A rule that beats the market it bet against over 20+ picks earns Proven. It covers NBA moneylines and
> the Nov 3 Senate races. No deposits, no wagering, no real money.
>
> Live: https://testyourhunch.vercel.app · Video: https://youtu.be/gHsQ5GAh2VE

## Experience with Walrus

> Walrus Memory is Hunch's long-term judgement, not a log.
>
> **What we write:** one typed line per conclusion:
> - TRUST: each voice's Brier score per context;
> - SPLIT: who won when sources disagreed;
> - RULE and PROVEN: what a user believes and what held up;
> - PICK: what a user said, with its anchor.
>
> 110 lines are on mainnet so far.
>
> **How we write and read:**
> - We write with rememberBulk and an idempotency key per snapshot, from a Postgres queue, so a restart
>   never writes twice.
> - We recall on every page through a cache, so pages never wait on the relayer.
> - The agent's call weighs each source by its recalled TRUST line and shows the blob id beside the
>   sentence. That makes memory visible: you can see why the agent leans the way it does.
> - Lines from test accounts are parked and never sent, because memories can't be deleted.
>
> **Overall:** once we measured the relayer's real behaviour (limits, latency, recall distances), it was
> dependable. It was the easiest way we've found to give an agent memory that outlives the app.

## Experience with the Tatum AI Builder

> We didn't use the AI Builder. We built with Tatum's Sui gRPC gateway directly, and every Sui call in
> Hunch goes through it:
> - anchoring pick batches (simulate and execute);
> - reading anchors back on each proof page.
>
> We wrapped it in a small client (`@hunch/chain`). The client paces calls, retries 429s and counts every
> call and stream frame against a daily credit budget. It falls back to a public fullnode while Tatum
> answers 402. The native gRPC transport with the key as metadata worked well. Our one request: a clearer
> doc page for native gRPC (not gRPC-web) from Node or Bun.

## One friction point with Walrus Memory

> The relayer's documented behaviour drifted from what we measured on mainnet:
> - **Rate limits:** writes allowed about 60 weighted requests a minute per delegate key, while the docs
>   said 30.
> - **recall:** in SDK 0.1.12 it has no `sort` option, so "the newest line per voice" needs a wide recall
>   and sorting on our side.
> - **restore():** it reported `total: 0` for namespaces that had memories.
> - **IDs:** the package and registry IDs in the docs were older than the ones the relayer serves at
>   `/config`.
>
> A "measured limits and current IDs" page next to the SDK would have saved us a day.
