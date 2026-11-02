# Hunch — Product Requirements (Track 1: Markets & Sports Prediction)

|                 |                                                                                                                                                                                               |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **One line**    | **Test your hunch before you bet.** Say it, Hunch tests it, Sui proves it, memory learns who to trust.                                                                                        |
| **Version**     | 1.1, Nov 2, 2026                                                                                                                                                                              |
| **Status**      | Ready to build. Repo, docs and the shared chain and memory packages are in place (Nov 2). One decision open: who builds and submits it (§18)                                                  |
| **Hackathon**   | [Total Recall, Walrus × Tatum](https://recall-tatum-walrus.vercel.app), Track 1. Deadline Nov 10, 2026, 17:00 UTC                                                                             |
| **Inspired by** | [Listen](https://listen.money) ([launch post](https://x.com/listendotmoney/status/2112643133683204379), Oct 20, 2026). Listen trades a thesis the moment you approve it. Hunch tests it first |

## 0. Summary

**What users come for.** Everyone who bets or forecasts on sportsbooks, Polymarket or Kalshi has
hunches:
- "Polymarket overprices NBA favourites."
- "The books are sharper than Kalshi on Senate races."

Almost nobody tests them honestly. Wins stick and losses fade, and nobody can say which source to trust
for which league. **Hunch is where you test a hunch before money touches it.**

**The loop: test → prove → trade.**
1. **Say it.** "When the books and Polymarket disagree by 5+ points on an NBA game, the books are right."
   The agent compiles it into a rule you can read.
2. **Test it.** A replay shows how the rule would have done over the last 7 days. Then you put it **on
   record**: from now on the monitor logs its picks before lock, each with a proof on Sui. No loss can be
   hidden, and no win can be claimed after the fact.
3. **Prove it.** Every morning the results come in and every voice is scored: your rule, the books,
   Polymarket, Kalshi. Walrus Memory keeps who was right, on what. The agent's calls lean on that and
   cite it. After 20 picks, a rule that beats the market it bet against earns **Proven**.
4. **Trade it (P1).** A proven BTC rule can trade on
   [DeepBook Predict](https://docs.sui.io/onchain-finance/deepbook/deepbook-predict/), Sui's prediction
   market, on testnet and within its limits. Sports and election rules keep their proven record; no Sui
   venue trades them.

**Why users come back:** every morning their hunches have new scores, and the agent knows a little more
about which source to trust.

**What Hunch is not:** a sportsbook. No deposits, no wagering, no real money. It's the lab before the bet.

## 1. Background

### 1.1 The track

- **Track 1 asks for:**
  - a prediction app for sports, elections, culture or markets;
  - that compares bookmaker odds with onchain sources;
  - tracks which voices were right;
  - lets users log picks before events;
  - and stores credibility scores in memory, so the app learns who to trust.
- **Its example directions:**
  - a sports companion that learns your leagues and trusted analysts;
  - odds dashboards that flag when sources disagree;
  - pick journals with post-game scorecards.
- **A submission needs:**
  - Walrus Memory writing on mainnet, with at least 10 memories;
  - Tatum RPC for onchain data;
  - a published blog post: what it does, how it uses Tatum and Walrus, and **how it learned over time**;
  - a public repo, a working demo and a 2–3 minute video;
  - the submitter's Tatum ID and SUI address. **One submission per person.**
- **Judging:** Walrus and Tatum integration 30% · technical quality 30% (including Tatum Sui RPC) ·
  creativity 20% · presentation 20%. Posting on X or LinkedIn earns a bonus.

### 1.2 The problem

1. **Hunches go untested.** Bettors act on theses they've never checked. Memory is selective: wins
   stick, losses fade, and a screenshot proves nothing.
2. **Testing honestly is hard alone.** A fair test needs:
   - every source's price at the moment of the call;
   - the result;
   - a record nobody can edit afterwards.

   Nobody keeps that for 30 NBA games a night.
3. **The sources disagree, and nobody tracks who was right.** Books, Polymarket and Kalshi often price
   the same game several points apart. Which one is sharper depends on the league and the market, and
   nobody scores them over time.
4. **Agent tools trade untested ideas.** Listen turns a thesis into live trades the moment you approve it,
   with real money. Nothing in between shows whether the thesis works.

### 1.3 What we learned from Listen

Details are in [Appendix A](#appendix-a-listen-in-detail). The points that shape Hunch:
- **The core loop works:** intent in plain words → a rule card (When · Then · Limits · Until) → approve
  once → it runs while you sleep.
- **Listen goes from a thesis straight to money. Hunch puts a test in between.** That test is also Track
  1's ask: track who was right, and learn who to trust.
- **Their guardrails are good, and we adopt them** (§4):
  - frozen questions for model-judged checks;
  - an edit is a new version;
  - stale data never matches;
  - limits are re-checked at fire time;
  - a "why it did or didn't fire" log.
- **Listen has no memory.** It doesn't learn which signals were right.
- **What the 130 replies to the launch asked for:**

| Theme           | Replies (examples)                                                                   | Hunch's answer                                                          |
| --------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Risk and trust  | "Vibe trading needs serious risk controls"; "The real test is trust and reliability" | Nothing trades until it's proven on record; limits on every rule (§6.2) |
| Money stuck     | "sent usdc to my account … not able to trade withdraw that amount"                   | No deposits. Testing costs nothing (§13)                                |
| Gated access    | about 25 replies begging for or trading invite codes                                 | No invite code, no wallet to try (§6.1)                                 |
| Scope           | "What chains does Listen support?"; "lighter perps?"                                 | One page lists every source, market and chain (§9)                      |
| Scams           | "Wtf is the ca", contract addresses, "rug"                                           | No token, said plainly in the app and the README                        |
| Who's behind it | "Who's the dev?"                                                                     | Open source; the team named on the landing page                         |
| The video       | "feels a bit too long"                                                               | 2:30, one story (§15)                                                   |

## 2. Goals, non-goals and success metrics

### 2.1 Goals

- **G1.** A plain-words hunch becomes a readable rule, with its 7-day replay, in under 10 seconds.
- **G2.** A first-time visitor sees a pick scored within one session, without a wallet.
- **G3.** A rule on record logs every pick before lock, each with a proof on Sui anyone can verify.
- **G4.** Every voice is scored per league and market type, and Walrus Memory holds the conclusions the
  agent acts on. A rule that beats its market earns Proven.
- **G5.** Show learning from real picks inside the window, honestly reported.

### 2.2 Track 1, ask by ask

| Track 1 asks for                                           | Hunch                                                                                                                                                                     |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A prediction app for sports, elections, culture or markets | NBA and EPL, the US midterms (Nov 3) and Kalshi's culture markets, BTC price questions (§9)                                                                               |
| Compare bookmaker odds with onchain sources                | The research card puts the books next to Polymarket (which settles onchain on Polygon), Kalshi, and Sui's own prices from DeepBook Predict. The radar flags splits (§6.4) |
| Track which voices were right                              | Every voice is scored per league and market type, and every rule against the market it bet against (§6.5)                                                                 |
| Users log picks before events                              | Signed picks, refused after lock, anchored on Sui, with a verify page (§6.3)                                                                                              |
| Memory stores credibility so the app learns who to trust   | Trust snapshots in Walrus Memory weight the agent's next call, which cites them (§6.6, §10)                                                                               |

### 2.3 How it maps to judging

| Criterion                    | Weight | What earns it                                                                                                                                                       |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Walrus and Tatum integration | 30%    | Memory holds the trust each voice earned, and the agent's call cites it (§10). Tatum's Sui gRPC anchors every pick, verifies it, and runs every Predict order (§11) |
| Technical quality            | 30%    | A typed rule compiler with a deterministic evaluator, onchain proofs, an honest "proven" test, a metered credit budget, tests (§8, §11, §12)                        |
| Creativity                   | 20%    | Listen's "vibe trading" with a test in between: say it → test it → prove it → trade it. Every hunch earns its way to money                                          |
| Presentation                 | 20%    | A 2:30 video with one story, a README that explains itself, a demo without an invite code (§15)                                                                     |

### 2.4 Non-goals

- **No real-money wagering, no deposits, no custody.** Hunch never places a bet on a sportsbook or on
  Polymarket.
- **No mainnet money.** Predict orders use test USDC on Sui testnet, and anchors stay on testnet. Memory
  is on mainnet, as the rules require.
- **No token.**
- No routing to outside venues, no perps, no leverage, no native mobile app.

### 2.5 Success metrics (by Nov 9)

| Metric                                        | Target                                                                                                           |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Time from a hunch to its rule card and replay | ≤ 10 s                                                                                                           |
| Hunches that compile on the 20-sample set     | ≥ 18                                                                                                             |
| First session reaches a scored pick           | Yes, through the BTC practice path, with no wallet                                                               |
| Picks on record, logged before lock           | ≥ 300, from ≥ 5 people or rules                                                                                  |
| Resolved events                               | ≥ 100: NBA nightly, the midterms, EPL weekends                                                                   |
| Rules judged for Proven                       | At least one rule with n ≥ 20 on record, compared with its market. The result is reported whichever way it falls |
| Picks accepted after lock                     | 0                                                                                                                |
| Verify passes on real picks                   | 100%                                                                                                             |
| Rule fire latency                             | ≤ 60 s after a snapshot meets its condition                                                                      |
| Predict                                       | The spike's order settles on testnet by Nov 4 (P0); a proven BTC rule's orders settle (P1)                       |
| Tatum credits                                 | Within the daily budget every day (§11)                                                                          |
| Learning                                      | The trust-weighted call vs the plain average and the books, Brier over time, reported as it comes out            |

## 3. Users

| Persona                                                                       | Today                                            | With Hunch                                                                                                                   |
| ----------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **The bettor** (primary): bets or trades on sportsbooks, Polymarket or Kalshi | Acts on hunches never tested; remembers the wins | Tests a hunch first: a replay, then a record on Sui. Learns which source is sharpest for their league. Decides with evidence |
| **The tipster**                                                               | Sells picks; followers can't check the record    | A record of every pick, logged before lock, nothing hidden; a public profile                                                 |
| **The rule-minded trader** (Listen's user)                                    | Approves a thesis and it trades at once          | Proves a BTC rule first; once proven, it trades on Sui testnet (P1)                                                          |
| **An AI agent** (P1)                                                          | No way to prove its calls                        | Logs picks through MCP under its owner's delegation, scored like everyone else                                               |

**Jobs to be done:**
- "Is my hunch actually right?"
- "Which source should I trust on NBA moneylines?"
- "Show me a record I can't fake."
- "Only let it trade once it has earned it."

## 4. Principles

1. **Test before trust.** Nothing trades until it has a record. Practice, then on record, then proven,
   then trading.
2. **Say it, see it, sign it.** Every hunch becomes a card in plain words: when it fires, what it does,
   its limits. Nothing goes on record before the user confirms it.
3. **The model writes the rule; code runs it.** The LLM compiles text into a typed rule. A deterministic
   evaluator decides when it fires. The model never acts on its own.
4. **Guardrails borrowed from Listen:**
   - a check the model judges stores its exact question, frozen at approval;
   - an edit is a new version, with its own record;
   - stale or missing data never counts as a match;
   - limits are re-checked when a rule fires;
   - every rule keeps a "why it did or didn't fire" log.
5. **Proof or it didn't happen.** Every pick on record has a time before lock, a signature, an anchor on
   Sui and a verify page.
6. **Memory you can read.** Every weight on screen links to the memory behind it.
7. **Plain words.** "Proof", not "Merkle leaf". "On record", not "anchored batch".
8. **Open by default.** No invite code, no wallet to try it.

## 5. Happy path

The bettor, from a first visit tonight to a proven rule five days later. Each step names what the user
sees, what Hunch does, and the requirement that builds it (§7).

| #   | When         | The user                                                                                                                                            | Hunch                                                                                                                                     | Req.       |
| --- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | Minute 0     | Opens the site and sees "What's your hunch?". Types: "When the books and Polymarket disagree by 5+ points on an NBA game, the books are right."     | Compiles the hunch                                                                                                                        | H1         |
| 2   | +10 s        | Reads the rule card and its replay: **"Last 7 days: 9 fires, 6 right. Brier 0.21, Polymarket's 0.24 on the same games."** That's the first evidence | Replays the rule over stored snapshots                                                                                                    | H2, H3     |
| 3   | +1 min       | Taps "See one scored now". A BTC hunch runs in practice: "BTC up more than 0.3% in 5 minutes → it ends the next 5 minutes higher"                   | Fires a practice pick on the live BTC price                                                                                               | H4         |
| 4   | +6 min       | **Sees that pick scored**, right or wrong, with the price at expiry                                                                                 | Resolves and scores the practice pick                                                                                                     | H8         |
| 5   | +8 min       | Signs in with a Sui wallet or zkLogin. Signs once: "Hunch may sign picks for me until Nov 30, at most 20 a day"                                     | Stores the delegation                                                                                                                     | H5         |
| 6   | +9 min       | Presses **Put it on record** on the NBA rule                                                                                                        | Version 1 goes on record                                                                                                                  | H2         |
| 7   | Tonight      | Asleep                                                                                                                                              | 30 min before tip-off, Polymarket is 6 points off DraftKings. The rule fires; the pick is signed under the delegation and anchored on Sui | H4, H5, H6 |
| 8   | Tonight      | Gets a notification: "Picked Lakers 58% · why · Undo before 02:00 UTC"                                                                              | —                                                                                                                                         | H4         |
| 9   | Optional     | Opens the game's research card: every source's price, the radar, the agent's call with the memory it cites                                          | —                                                                                                                                         | H7, H9     |
| 10  | Next morning | Reads: "Your rule went 4 for 5. On NBA moneylines the books beat Polymarket 7 times in 10."                                                         | Resolves, scores every voice, writes trust snapshots to Walrus Memory                                                                     | H8, H9     |
| 11  | Anytime      | Shares a pick's verify link; anyone checks it against Sui                                                                                           | Reads the anchor through Tatum gRPC                                                                                                       | H5         |
| 12  | Day 3–5      | Sees the agent's call change: "Leaning on the books for NBA moneylines (n=31)". Taps it, and the memory opens                                       | Recalls the newest trust snapshots                                                                                                        | H9         |
| 13  | Day 5        | **The rule earns Proven:** 23 picks on record, Brier 0.19 against Polymarket's 0.23 on the same games. Shares the scorecard                         | Computes Proven per version                                                                                                               | H10        |
| 14  | After        | Uses what they learned wherever they forecast. A proven BTC rule gets "Let it trade" on DeepBook Predict, testnet                                   | Places orders within the rule's limits                                                                                                    | H13 (P1)   |

- **Where value first lands:** step 2 (the replay) and step 4 (a scored pick), both in the first session.
  Sports picks take hours to resolve, so the first session must not depend on them.
- **What the user takes away:** evidence about which hunches hold and which sources to trust, and a record
  anyone can check.

## 6. Features and flows

### 6.1 Try it, no wallet

- The landing page leads with "What's your hunch?" and three examples:
  - "When the books and Polymarket disagree by 5+ points on an NBA game, the books are right."
  - "On Senate races, Kalshi is sharper than Polymarket when they split by 5+ points."
  - "When BTC rises more than 0.3% in 5 minutes, it keeps rising for the next 5."
- A visitor's rules run in practice. Signing in keeps them, and their picks, under the visitor's name.

### 6.2 The rule card and the ladder

```
RULE · The books beat Polymarket on NBA splits           v1 · compiled ✓ · practice
WHEN (all must hold)
  NBA game · 30 min before tip-off · books vs Polymarket ≥ 5 pts apart
THEN
  PICK the books' side · confidence = the books' price (vig removed)
AGAINST  Polymarket's price
LIMITS   ≤ 10 picks a day · until Nov 30
Last 7 days: 9 fires · 6 right · Brier 0.21 vs Polymarket 0.24     [Put it on record] [Edit]
```

**The ladder:**

| Stage                      | What happens                                                                                                                        | Who sees it           |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| **Practice**               | The rule fires against real data. Its picks appear in the rule's log and are scored for the rule's own record. They aren't anchored | The user              |
| **On record**              | Picks are signed, anchored on Sui and scored publicly, each with a verify page                                                      | Everyone              |
| **Proven**                 | A version with ≥ 20 resolved picks on record whose Brier beats the market it bet against (`against`) on the same events             | A badge, for everyone |
| **Trading** (P1, BTC only) | A proven BTC rule places orders on DeepBook Predict, testnet, within its limits                                                     | Everyone              |

- **Proven is computed, never claimed.** The badge shows n and the comparison. A rule loses it if its
  record falls behind its market.
- **Each version keeps its own record.** An edit compiles a new version, which starts in practice. A
  losing rule can't be edited into a winning record.
- **Replay:** the rule over the last 7 days of stored snapshots, with fires, hits, and Brier against its
  market. An event with no stored snapshot is skipped and counted.
- **Clarifying question:** if a hunch is ambiguous ("the favourite": by which source?), the agent asks
  one question instead of guessing.
- **Pause** stops one rule. **Pause all** stops every rule, and revokes the Predict session once trading
  exists.

### 6.3 The monitor and the proof

- **The monitor** evaluates rules every minute against the latest snapshots, and at schedule edges (N
  minutes before lock).
- **Snapshots come from free sources** (§9): every 5 minutes within 2 hours of lock, every 30 minutes
  before that, and once at lock. BTC is read every minute. No polling touches Tatum (§11).
- **When a rule on record fires:**
  1. Hunch re-checks the limits and the data's freshness.
  2. It writes the pick: side, confidence, every source's price at that moment, the rule version, and
     why.
  3. It signs the pick with its agent key under the user's delegation (§5, step 5).
  4. The pick joins the next anchor batch on Sui. Batches go every 10 minutes, and always before the
     event's lock.
  5. A notification says what fired and why, with **Undo** until lock.
- **Undo** adds a signed retraction before lock. The record keeps both; a retracted pick isn't scored.
- **A pick after lock is refused.** A rule at its limits pauses and asks.
- **The verify page** (`/p/<id>`, no sign-in) shows:
  - the pick and the delegation;
  - the Merkle proof;
  - the anchor transaction, read through Tatum gRPC;
  - its time against the lock.

### 6.4 The research card (per event)

- **Prices side by side:** the books (vig removed), Polymarket, Kalshi, and for BTC, Sui's own price
  from DeepBook Predict.
- **The disagreement radar** flags gaps above a threshold, and shows who won past splits of this kind.
- **The agent's call:** a trust-weighted probability, with "leaning on" and "away from" lines that cite
  the memories used. Example: "Leaning on the books for NBA moneylines (n=31), away from Polymarket on
  underdogs (4 of 11)."

### 6.5 Resolve and score

- **How each kind resolves:**
  - **Sports** from ESPN's final scores.
  - **Elections and culture** from the markets' own resolution: Kalshi's `result` and Polymarket's
    resolved outcome.
  - **BTC** from the BTC price at expiry (practice and on record), or onchain on Predict (trading).
- **Voices:** each person, each rule version, the books, Polymarket and Kalshi. Pundits and agents come
  later (P1).
- **Scores per voice × league × market type:** hit rate, Brier and calibration buckets, with shrinkage
  for small samples.
- **Every rule is also scored against its market:** its Brier and the `against` source's Brier on the
  same events. That comparison decides Proven.
- **Every resolution writes trust snapshots to Walrus Memory** (§10).

### 6.6 Learn who to trust

- The agent's call is weighted by the newest trust snapshots, recalled from Walrus Memory.
- **When a weight moves, the card says why** and links the memory.

### 6.7 The record, Proven, and the learning chart

- **A rule's page:** its record per version, its comparison with its market, its picks with their
  proofs, and its "why it did or didn't fire" log.
- **Proven** is shown with its numbers: "23 picks · Brier 0.19 vs Polymarket 0.23 · since Nov 4".
- **The learning chart:** Brier over time for the trust-weighted call vs the plain average vs the books,
  from picks on record since Nov 3. BTC and sports are shown apart.
- **Scorecards:** "23 picks · 0 hidden · Proven". Each links to its proofs and shares as an image for X.

### 6.8 Trading a proven BTC rule (DeepBook Predict, testnet)

The spike is P0; trading is P1.
- **The venue:**
  - BTC/USD markets that expire every 1 or 5 minutes, live on Sui since Sep 12, 2026;
  - a position pays a fixed amount if the price settles inside its range;
  - USDC collateral, with a liquidity pool on the other side;
  - anyone can settle, from Pyth's price at expiry.
  - The SDK is `@mysten/deepbook-v3` (`/predict`, `/sessions`). It runs on `SuiGrpcClient`, so every
    call goes through Tatum.
- **The spike (P0, by Nov 4):** with the team's test key, queue one order, see it fill, and read its
  settlement. This proves the path before anyone depends on it.
- **Trading (P1):**
  - **Setup:** the user moves test USDC into their Predict account and authorizes a session for Hunch, for
    up to 30 days. A session can trade but not withdraw.
  - **On each fire:** Hunch re-checks the limits (premium per order and per day, open exposure). It queues
    the order (`planMint`, then `enqueuePlan`) and reads the outcome (`waitForOutcome`). The pick, the
    order's digest and the outcome become one proof.
  - **Predict's own limits:** it fills only queued orders, takes none in the last ~10 s before expiry,
    and only between 0.15 and 0.85 probability.
  - **A session has no spending cap,** so Hunch enforces the rule's limits before every order. The
    account holds only what the user moved in.

### 6.9 Credit meter

A small status panel shows:
- Tatum calls today by method, against the daily budget (§11);
- whether Sui reads are on the public fullnode after a 402;
- every source's last snapshot, and the last anchor.

### 6.10 Later (P1–P2)

- **Trading** for proven BTC rules (§6.8).
- **Nudges:** `analyze` over a user's picks writes bias insights, such as "Your 90%+ picks hit 2 of 7".
- **Paper positions:** units at the market's price when a pick is logged, exits as legs, and P&L per
  rule.
- **Telegram:** `/hunch`, notifications, Undo.
- **Groups:** an invite link, a group scoreboard, trust per member.
- **Pundits:** paste a link and the agent extracts the pick. The text is untrusted, so it's wrapped and
  checked first.
- **Agents as forecasters:** an MCP server lets any agent log picks under a delegation its owner signed.
- **More books:** The Odds API (FanDuel, Pinnacle, Betfair) at lock.
- **Sealed picks:** Seal time-lock, so nobody copies a pick before lock.
- **X-post triggers:** need paid X API access.
- **User-owned memory:** the user brings a Walrus Memory account, and Hunch writes as a delegate.

## 7. Requirements

### 7.1 MVP (P0)

| ID  | Requirement                                                                                                                                              | Done when                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| H1  | **Compiler:** plain words → a typed rule (§8); one clarifying question when ambiguous                                                                    | 18 of 20 sample hunches compile; the rest say why                                        |
| H2  | **Rule card and ladder:** every field in plain words; practice by default; Put it on record; Edit (a new version, with its own record); Pause; Pause all | The card renders every kind in §8                                                        |
| H3  | **Replay:** the rule over the last 7 days, with Brier against its market                                                                                 | Its counts match a hand check on 3 rules                                                 |
| H4  | **Monitor:** evaluates every minute and at schedule edges; re-checks limits and freshness; a "why it did or didn't fire" log; notifications with Undo    | A rule on record fires within 60 s of a snapshot that meets it                           |
| H5  | **Picks and proof:** a one-time delegation; picks signed under it; refused after lock; anchored in batches; a public verify page                         | Verify passes on a real pick; a pick after lock answers 409; a changed pick fails verify |
| H6  | **Sources:** Polymarket, Kalshi, ESPN, a BTC ticker (§9)                                                                                                 | Tonight's NBA games and the midterm races have prices from ≥ 2 sources                   |
| H7  | **Research card:** prices side by side, the radar, the agent's cited call                                                                                | Every number links to its source or memory                                               |
| H8  | **Resolve and score:** per voice × league × market type, and each rule against its market                                                                | Each resolution scores every voice that picked it                                        |
| H9  | **Trust memory:** snapshots to Walrus Memory after each resolution; the agent's call recalls and cites them                                              | A call changes after new snapshots and cites them                                        |
| H10 | **Record and Proven:** a rule's page, Proven computed per version, the learning chart, scorecards                                                        | Proven appears only when n ≥ 20 and the rule beats its market                            |
| H11 | **Credit meter:** Tatum calls counted by method; a daily budget; the 402 fallback shown                                                                  | A day's spend stays under its budget                                                     |
| H12 | **Predict spike:** one order queued, filled and settled on testnet                                                                                       | Done by Nov 4, with its digest                                                           |

### 7.2 Later

| ID  | Requirement                                                                                       | Priority |
| --- | ------------------------------------------------------------------------------------------------- | -------- |
| H13 | Trading for proven BTC rules on DeepBook Predict (sessions, limits re-checked before every order) | P1       |
| H14 | Nudges from `analyze`                                                                             | P1       |
| H15 | Paper positions with exits and P&L                                                                | P1       |
| H16 | Telegram: `/hunch`, notifications, Undo                                                           | P1       |
| H17 | Groups: invite link, group scoreboard, member trust                                               | P1       |
| H18 | Pundit picks from a pasted link                                                                   | P1       |
| H19 | Agents as forecasters through MCP                                                                 | P1       |
| H20 | More bookmakers through The Odds API                                                              | P2       |
| H21 | Sealed picks (Seal time-lock)                                                                     | P2       |
| H22 | X-post triggers                                                                                   | P2       |
| H23 | User-owned memory accounts                                                                        | P2       |

## 8. The rule

The compiler's output must validate against a Zod schema. Anything outside it is refused, not guessed.

```json
{
  "name": "The books beat Polymarket on NBA splits",
  "version": 1,
  "scope": { "league": ["NBA"], "market": "moneyline" },
  "when": {
    "all": [
      { "kind": "before_lock", "minutes": 30 },
      { "kind": "gap", "a": "books", "b": "polymarket", "min_pts": 5 }
    ]
  },
  "then": [
    { "kind": "pick", "side": { "favourite_of": "books" }, "confidence": { "price_of": "books" } }
  ],
  "against": "polymarket",
  "limits": { "picks_per_day": 10, "until": "2026-11-30" },
  "stage": "practice"
}
```

| Part        | MVP kinds                                                                                                                                                                                     | Later                                                |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **Scope**   | league or competition; market type: moneyline, spread, total, yes/no; BTC up/down                                                                                                             | player props                                         |
| **When**    | `before_lock`, `price` (a source ≥ or ≤ x), `gap` (two sources ≥ n points apart), `move` (a change over a window), `voice` (a voice with trust ≥ t picks), `consensus` (trusted voices agree) | `news`, `x_post`                                     |
| **Then**    | `pick`, `notify`, `ask_me`                                                                                                                                                                    | `trade` (Predict, proven BTC versions only), `paper` |
| **Against** | the market the rule is judged against: `books`, `polymarket`, `kalshi`, or `predict` for BTC                                                                                                  | —                                                    |
| **Limits**  | picks a day, an end date                                                                                                                                                                      | premium per order and per day, open exposure         |
| **Stage**   | `practice`, `on_record`. `proven` is computed, never set                                                                                                                                      | `trading`                                            |

- **Evaluation:**
  - `all` and `any` groups.
  - Each condition reads the newest snapshot no older than twice its refresh interval (§6.3): 10
    minutes near lock, 60 minutes before that, 2 minutes for BTC.
  - **A stale or missing source makes the condition false, never true.**
- **Judgement calls** (for example "a trusted voice is bullish") are model checks. Each stores its exact
  question at approval, and the question never changes after that.
- **Every fire records** the rule version, the inputs it saw and its outputs. The proof shows why.

## 9. Data sources

Checked Nov 2 ([V] probed from our machine, [D] from the docs).

| Source                                           | What Hunch takes                                                    | Endpoint                                                                          | Auth and limits                                                                            | Role                                                                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Polymarket Gamma + CLOB [D]                      | Events, markets, outcome prices, price history, resolution          | `gamma-api.polymarket.com/{events,markets}`, `clob.polymarket.com/prices-history` | None for reads; thousands of requests per 10 s                                             | The main market feed. Blocked on some networks (ours resolves it to 127.0.0.1), so it runs from the deployed server |
| Kalshi [V]                                       | Markets, events, 4,076 sports series, candlesticks, `result`        | `api.elections.kalshi.com/trade-api/v2/…`                                         | None for market data; about 20 reads/s                                                     | The second market feed and resolution                                                                               |
| ESPN scoreboard [V]                              | Fixtures, status, final scores; DraftKings moneylines before a game | `site.api.espn.com/apis/site/v2/sports/{basketball/nba,soccer/eng.1}/scoreboard`  | None; unofficial                                                                           | The books and results                                                                                               |
| A public BTC ticker [not probed]                 | BTC/USD every minute                                                | e.g. `api.exchange.coinbase.com/products/BTC-USD/ticker`                          | None                                                                                       | BTC rules' monitor and resolution                                                                                   |
| DeepBook Predict [V: registry read through gRPC] | BTC/USD range markets, 1- and 5-minute expiries, settled onchain    | `@mysten/deepbook-v3@2.9.1` on `SuiGrpcClient`; testnet registry `0x85cf…ccc4`    | A wallet; premium ≥ 1 USDC; 0.02 USDC per order; probability 0.15–0.85; queued orders only | The spike (P0); Sui's own BTC price; trading (P1)                                                                   |
| Pyth on Sui [V]                                  | Price objects onchain                                               | `@pythnetwork/pyth-sui-js@4.0.0`                                                  | Hermes needs an API key since Aug 26; objects can be stale                                 | A cross-check only                                                                                                  |
| The Odds API [V]                                 | More bookmakers (FanDuel, Pinnacle, Betfair)                        | `api.the-odds-api.com/v4/sports/{sport}/odds`                                     | `apiKey`; 500 credits a month free                                                         | Later (P2)                                                                                                          |
| Tatum Prediction Market API [D]                  | Polymarket and Kalshi in one format, with resolution                | `api.tatum.io/v4/data/prediction/…`                                               | **100 credits a call, 200 for history**                                                    | Off by default (§11)                                                                                                |

- **What comes from where:** sports from ESPN; elections and culture from Polymarket and Kalshi; BTC
  from a ticker and from Sui.
- **No Sui venue offers sports or election markets with an SDK.** WaterX Predict lists sports on Sui,
  but we found no SDK. Those rules are proven on record, not traded.

## 10. Walrus Memory

Postgres does the math. **Memory holds the conclusions the product acts on,** one typed line per memory,
so any agent can recall and read them.

| Namespace      | Example line                                                                                       | Used for                                         |
| -------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `rules:<user>` | `RULE · v2 · The books beat Polymarket on NBA splits · gap≥5 · 30m before lock · as_of=2026-11-04` | What the user believes, and how the rule changed |
| `rules:<user>` | `PROVEN · rule=books-splits v2 · n=23 · brier 0.19 vs polymarket 0.23 · as_of=2026-11-08`          | Which hunches held up                            |
| `picks:<user>` | `PICK · 2026-11-04T23:30Z · rule=books-splits v2 · LAL ML · conf=0.58 · anchor=<digest>`           | "What did I say last time"                       |
| `trust:public` | `TRUST · voice=books · ctx=NBA moneyline · n=31 · brier=0.20 · trend=up · as_of=2026-11-07`        | The agent's weights (recalled newest first)      |
| `radar:public` | `SPLIT · NBA ML · books 58 vs poly 52 · winner=books · n=12`                                       | The radar's learned lean                         |

- **Every weight on screen links to its memory's blob.**
- **The account:** in the MVP, Hunch writes to the submitter's Walrus Memory account on mainnet,
  namespaced per user. User-owned accounts are P2.
- **SDK** (`@mysten-incubation/memwal@0.1.12`):
  - `rememberBulk` (up to 20 a call) after each resolution, with an `idempotencyKey` per snapshot so a
    retry doesn't duplicate it;
  - `recall({ query, namespace, sort: "recent", limit })` for the agent's weights.
- **Limits** (the relayer's, as measured):
  - 60 writes and 200 reads a minute per key, about 24 s per write;
  - an empty recall with `dropped_count > 0` is retried;
  - single memories can't be deleted, and the relayer sees plaintext, so nothing private goes in.

## 11. Sui and Tatum

- **Move (testnet):** a small `hunch::anchor` module. It stores the Merkle root of each pick batch with
  the time from the `Clock`, and emits an event. Gas is sponsored.
- **Tatum Sui gRPC** (gRPC only; Sui's JSON-RPC is deprecated):

| Call                                        | Why                                                                                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `ExecuteTransaction` (sponsored)            | Anchor pick batches                                                                                                                        |
| `GetTransaction`, `WaitForTransaction`      | The verify page; anchor confirmation                                                                                                       |
| `GetObject`                                 | Predict markets (Sui's BTC price; the `against` price for BTC rules)                                                                       |
| `SimulateTransaction`, `ExecuteTransaction` | Predict orders (built by the SDK on `SuiGrpcClient`)                                                                                       |
| `SubscribeCheckpoints`, filtered (opt-in)   | Live fills on the demo screen only. Off by default: even a filtered stream sends about 720 frames an hour, and Hunch knows its own digests |

- **Tatum is where Hunch acts, not where it polls.** Every anchor, verify, Predict read and order goes
  through Tatum. Polling uses the free sources in §9.
- **The Prediction Market API isn't free:** 100 credits a call, 200 for history. A free plan would last
  about 1,000 calls, so Hunch doesn't depend on it. With a paid plan, it could cross-check resolutions
  for events with picks, at most 20 calls a day.
- **The credit budget** for a free plan (assumed: 100K credits a month, 3 requests a second, about 2
  credits per gRPC call; §16):

| Use                                                                                | Calls in 8 days | Credits          |
| ---------------------------------------------------------------------------------- | --------------- | ---------------- |
| Anchors: one batch per 10 minutes with new picks, about 4 calls each               | ≤ 4,600         | ≤ 9,200          |
| Verify pages, cached per pick                                                      | about 400       | about 800        |
| Predict reads at fire time (BTC rules' `against` price)                            | about 1,000     | about 2,000      |
| Predict trading (P1): 25 orders a day, about 8 calls each, plus 2 settlement reads | about 2,000     | about 4,000      |
| **Total**                                                                          | **about 8,000** | **about 16,000** |

- **The meter** (H11):
  - every Tatum call is counted by method;
  - a daily budget (2,000 credits by default) pauses the non-essential reads once it's spent, and
    anchors keep priority;
  - a 402 (out of credits) switches Sui reads to the public fullnode's gRPC until Tatum answers again.

## 12. Architecture

```
web (React) ─────────┐
MCP (P1) ────────────┼─▶ API (Bun, Hono)
Telegram (P1) ───────┘     ├─ compiler: LLM → Zod rule → card
                           ├─ monitor: rules × snapshots, every minute
                           ├─ ingest: Polymarket, Kalshi, ESPN, BTC ticker
                           ├─ resolver + scorer → records, Proven, trust snapshots
                           ├─ anchor batcher → Sui testnet (Tatum gRPC)
                           ├─ memory writer → Walrus Memory (mainnet)
                           └─ trader (P1): DeepBook Predict orders (session, testnet)
Postgres
```

- **Stack:**
  - Bun, Hono, React and Postgres;
  - a Move package for the anchor;
  - `@mysten/sui` with a native gRPC transport for Tatum;
  - `@mysten/deepbook-v3` and `@mysten-incubation/memwal`;
  - an LLM through one provider API.
- **Data model:**
  - `events`, `snapshots` (source, price, at);
  - `rules`, `rule_versions` (each with its record), `fires` (inputs, outputs, why);
  - `delegations`, `picks`, `retractions`, `anchors`;
  - `scores`, `trust`, `orders` (P1);
  - `tatum_usage` (by method and day).
- **The compiler** sends the hunch, the schema and the upcoming events to the model. It validates the
  JSON, renders the card, and stores the rule's text and version.
- **The monitor** is one worker loop. Ingestion is paced to each source's limits and cached.

## 13. Safety, trust and legal

- **No real money.** Picks are signatures. Trading (P1) uses test USDC on testnet, and only for proven
  rules.
- **The model can't act alone:** it compiles, the user approves, code evaluates. Fetched or pasted text
  is untrusted; it is wrapped and checked before the model reads it.
- **Limits on every rule,** practice first, Pause all, a frozen question for every model check.
- **Records can't be gamed:** each version keeps its own record, retractions stay visible, and a pick
  after lock is refused.
- **Proofs are tamper-evident:** a pick changed after the fact fails verify.
- **The Predict session (P1) can't withdraw.** It has no spending cap, so Hunch enforces limits before
  every order, and Pause all revokes the session.
- **Legal framing:** a testing lab and a forecasting journal, not a sportsbook. We offer no odds and pay
  nothing out, and we use public market data only.
- **Test data is labelled** "(test)" everywhere.

## 14. Plan and milestones

| Day                    | Build                                                                                                                                                                                     | Done when                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Nov 2**              | Accounts (Tatum, Walrus Memory, SUI address); repo; `hunch::anchor` on testnet; a plain pick form with lock checks; Kalshi, Polymarket and ESPN ingest; **request test USDC for Predict** | One real pick anchored and verified                                                 |
| **Nov 3: midterm day** | Real picks on the races and tonight's NBA before the polls close and tip-off; snapshots from every source                                                                                 | ≥ 30 picks on record, anchored                                                      |
| Nov 4                  | Compiler (H1), rule card and ladder (H2), replay (H3); **Predict spike (H12)**                                                                                                            | 18 of 20 sample hunches compile; replay counts check out; the spike's order settles |
| Nov 5                  | Monitor and delegation (H4, H5); resolve and score (H8); trust memory (H9)                                                                                                                | A rule on record fires on tonight's NBA; the morning's resolution writes snapshots  |
| Nov 6                  | Research card (H7); record and Proven (H10); credit meter (H11)                                                                                                                           | The agent's call cites memory; Proven is computed on real records                   |
| Nov 7                  | Learning chart and scorecards; polish; **record the video**. Trading (H13) only if everything else is done                                                                                | The chart draws from picks on record                                                |
| Nov 8                  | Blog post, README (every Tatum call and the credit budget), the X post                                                                                                                    | Published                                                                           |
| **Nov 9**              | **Submit**                                                                                                                                                                                | The form is in                                                                      |
| Nov 10, 17:00 UTC      | Hard deadline                                                                                                                                                                             | —                                                                                   |

**Real data starts on Nov 3.** The record can't be made up later, so the plain pick form goes live
before the compiler does.

## 15. The demo (2:30)

1. **0:00 Hook.** "Everyone has a hunch. Nobody tests it."
2. **0:15 Say it.** "When the books and Polymarket split by 5 points on NBA games, the books are right."
   → The card → the replay: 9 fires, 6 right, ahead of Polymarket → Put it on record.
3. **0:45 Tested while you sleep.** The radar flags tonight's split. The pick lands 30 minutes before
   tip-off, and its proof verifies through Tatum.
4. **1:05 No hiding.** A late pick is refused; last night's loss stays on the record.
5. **1:15 The morning after.** Every voice is scored. Trust snapshots land in Walrus Memory, and the
   agent's call cites them.
6. **1:40 Proven.** 23 picks, ahead of Polymarket on the same games: the badge, the scorecard, the
   learning chart.
7. **2:00 Then trade.** A proven BTC rule places an order on DeepBook Predict, and it settles onchain.
   If trading isn't built, the spike's real order stands in, labelled as such.
8. **2:20** "Hunch: test it, prove it, then trade it."

## 16. Assumptions and dependencies

- **Tatum:** a free plan gives about 100K credits a month at 3 requests a second, and a Sui gRPC call
  costs about 2 credits (unverified for Sui). If it costs more, the daily budget in §11 cuts reads first.
- **Polymarket** is reachable from the deployed server's region.
- **ESPN's** unofficial scoreboard stays up through Nov 9.
- **Test USDC for Predict** arrives within a few days of the request.
- **Walrus Memory's mainnet relayer** stays available. Writes are batched and retried.
- **An LLM** compiles a hunch in under 10 s at the chosen model's price.

## 17. Risks

| Risk                                                | Mitigation                                                                                                           |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Eight days                                          | P0 is 12 items; trading and everything social are P1. The anchor module is small, and the SDKs do the heavy lifting  |
| Too few picks for Proven by the demo                | NBA every night from Nov 3, the midterms, and BTC rules every 5 minutes. The threshold (n ≥ 20) is shown, not hidden |
| Proven on BTC is mostly noise                       | BTC is shown apart. The badge shows n and the comparison, and the threshold could rise for BTC (§18)                 |
| The model compiles a wrong rule                     | Schema validation, the card in plain words, the replay, practice first                                               |
| Tatum credits run out                               | Polling never uses Tatum; the meter and the daily budget; the public fullnode after a 402                            |
| Source limits                                       | Snapshots on §6.3's schedule, cached                                                                                 |
| Test USDC arrives late                              | Requested on Nov 2; only the spike and trading depend on it                                                          |
| Pyth's Hermes needs a key; Sui objects can be stale | Predict settles itself; Pyth is only a cross-check                                                                   |
| Walrus Memory outages                               | Batch, retry, check the relayer before the demo                                                                      |
| Too close to Listen                                 | A different job (test before you bet), a different market, our own words and look                                    |

## 18. Open questions

1. **Who builds and submits it?** One submission per person. The submitter needs their own Tatum ID, SUI
   address and Walrus Memory account. **This blocks Nov 2.**
2. **The name.** "Hunch" is a working name.
3. **The Proven bar.** n ≥ 20 and a better Brier than the market. Should BTC need more, say n ≥ 50?
4. **A paid Tatum plan?** Not needed for §11. It would only add the Prediction Market API cross-check.
5. **Predict on mainnet?** It would use real USDC. The plan is testnet only.
6. **A mascot,** like Listen's Soren? Nice for the video, not needed.

## Appendix A: Listen in detail

Read Nov 2 from the launch thread, its 97-second video, listen.money's 19 docs pages, its legal pages and
`llms.txt`. The app is invite-only, so we saw it only through these.

- **What it is:** a Solana-only "agentic trading terminal" for memecoins: any token with a pair on
  Pump.fun, Bonk, Jupiter and similar venues, in SOL or USDC ([docs](https://listen.money/docs)). The
  launch post says "DeFi exchange"; the [disclosures](https://listen.money/legal/agentic-disclosures) say
  "a terminal, not a broker, exchange or investment adviser".
- **The agent, Soren,** is a pixel cat labelled "latent monitor": "count on it, even while you sleep". It
  shows every tool call while it researches. A "read" of a coin covers holders, the dev, how wallets
  connect, top-10 concentration and what it would watch ([docs/soren](https://listen.money/docs/soren)).
- **Conditionals, the core** ([docs/conditionals](https://listen.money/docs/conditionals),
  [docs/creating](https://listen.money/docs/creating)):
  - a rule is When + Then + Limits + Until, firing once or on every match;
  - each fire starts a run of legs: the buy, then its exits;
  - Soren writes the rule back as one sentence; the user approves once and authorizes the agent wallet;
  - an edit is a new version to approve, and the old one keeps watching until then.
  - **The video's example:** "When @elonmusk posts a pet, buy the first coin named after it to graduate.
    Sell half at 2×" compiles to:
    - `WHEN (all must hold)`: an X post of a pet · a coin named after it · first to graduate;
    - `THEN BUY 2 SOL` → `LEG 2: price ≥ 2× entry` → `SELL ½`;
    - "compiled ✓".
  - **Fills shown:** "Bought 6.1M INTERN · first to graduate · 0.31 s · +212%"; "Shorted BTC PERP 5× ·
    Trump on Iran · 0.24 s".
- **Triggers** ([docs/triggers](https://listen.money/docs/triggers)):
  - tweets from named accounts (topic, image, views), and coins launched about a tweet;
  - news, such as a Binance listing;
  - price or market cap; dev, sniper and holder metrics;
  - wallets: copy one, or wait for N to agree;
  - time windows.
  - A model-judged check stores its question, frozen at approval.
  - The video marks "BTC holds $100K", "funding flips negative", "oil +3% in a day" and "CPI prints < 3.0"
    as coming soon.
- **Exits:** take profit, stop loss, trailing stop, dev sell, copy the leader's exit
  ([docs/exits](https://listen.money/docs/exits)).
- **Guardrails** ([docs/budget](https://listen.money/docs/budget),
  [docs/statuses](https://listen.money/docs/statuses)):
  - re-checked at buy time: entry ceiling, liquidity floor, signal freshness, a balance to keep, an
    exposure cap, a cooldown, coin age, price impact, slippage;
  - budget caps: per-order spend, buy count, once per coin;
  - stale or unknown data never matches; after 20 failed buys in a row it gives up on a coin.
- **The conditional page** shows:
  - runs and legs;
  - a "why it did or did not buy" log;
  - transaction signatures;
  - the proof that fired it;
  - the version history.
- **Custody:** non-custodial, keys in Turnkey enclaves, exportable. The user funds the agent wallet; its
  authorization expires, and rules wait until it's renewed. Helius streams data and sends transactions.
- **Money:** a 1% fee per trade, 10–44% back as SOL cashback by volume tier, 20% of invitees' fees to
  referrers. No token.
- **Memory:** none advertised. Personalization is watchlists, tracked wallets, follows and lanes.
- **Not `piotrostr/listen`,** the open-source Solana agent toolkit that Kresus acquired in Nov 2025.
  Listen's account dates from Jul 2026 and its stack differs.
- **The category:**
  - Catalyst ($30M seed led by Sequoia, Oct 2026), with a human approving each step;
  - exchange agent kits from Binance, OKX and Bitget, plus Robinhood Cortex and Nansen;
  - the open-source HKUDS Vibe-Trading.
  - A common critique: users don't understand their own strategies, and the agents' decisions are opaque
    ([BlockEden](https://blockeden.xyz/blog/2026/03/10/vibe-trading-natural-language-replaces-code-crypto/)).
- **The replies** (130, Nov 2): mostly emoji, invite codes and collab spam. The substantive ones are in
  §1.3.

## Appendix B: Sources

- Listen:
  - [launch post](https://x.com/listendotmoney/status/2112643133683204379),
    [thread 2](https://x.com/listendotmoney/status/2112643137479041093),
    [thread 3](https://x.com/listendotmoney/status/2112643139014148397);
  - the launch video (97 s);
  - [docs](https://listen.money/docs), [security](https://listen.money/docs/security),
    [terms](https://listen.money/legal/terms).
- Tatum: [Prediction Market API](https://docs.tatum.io/reference/prediction-api),
  [blog](https://tatum.io/blog/prediction-market-api), [plans](https://docs.tatum.io/docs/plans-limits),
  [Sui gRPC](https://docs.tatum.io/reference/sui-grpc)
- Sui: [DeepBook Predict](https://docs.sui.io/onchain-finance/deepbook/deepbook-predict/),
  [Seal patterns](https://docs.sui.io/sui-stack/seal/example-patterns)
- Data: [Polymarket rate limits](https://docs.polymarket.com/api-reference/rate-limits),
  [Kalshi](https://docs.kalshi.com), [The Odds API](https://the-odds-api.com/liveapi/guides/v4)
- Walrus Memory: [MemWal API](https://github.com/MystenLabs/MemWal/blob/dev/docs/sdk/api-reference.md)
- The hackathon: [Total Recall, Walrus × Tatum](https://recall-tatum-walrus.vercel.app)
