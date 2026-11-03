# Who else builds memory and prediction agents (Nov 3, 2026)

| Field      | Value                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------- |
| **Date**   | Nov 3, 2026                                                                                 |
| **From**   | Harry Phan, desk research (web, X search snippets, GitHub, arXiv)                           |
| **Status** | Reference. It informs [build-now.md](build-now.md) §4; it decides nothing on its own        |

**In short:** nobody ships the whole Hunch loop. That loop is a plain sentence, a replay against the
market, following it live, picks signed before lock with a Sui anchor through Tatum, and per source
trust lines in Walrus Memory that the next call cites. Inside the hackathon, though, **scoring which
sources to trust is already common in Track 1**, so it won't set Hunch apart by itself. Hunch's ground
is the flow and the honesty of its scoring.

How this was gathered: X could not be read directly (fetches returned HTTP 402), so X evidence comes
from search snippets, with dates inferred from post ids. Volume, accuracy and profit figures are self
reported unless a source says otherwise.

## 1. On X, late October is about platforms, not agents

1. No new memory and trading agent broke out between late October and Nov 3.
2. The two live stories: the NBA named Kalshi and Polymarket its preferred prediction market partners
   (around Oct 26), and Polymarket paused international trading after its second third party script
   breach in four months (Oct 29).
3. One aggregator post lists Total Recall with a Nov 30 deadline. The organizer's page says **Nov 10,
   17:00 UTC**; trust that one.

## 2. Agents with real users trade, but none learn which source to trust

| Product | What it does | Memory | Proof of picks |
| :--- | :--- | :--- | :--- |
| Public (Sept 25, 2026) | Plain words become an agent that trades on Kalshi; sports not listed | No | No |
| TurbineFi | Plain English becomes a strategy, backtested on about four weeks of Kalshi books, then a cloud bot (1,593 bots, self reported) | No | No |
| Olas Polystrat | Autonomous Polymarket agents; claims 33% profitable against about 16% of users (self reported) | "Improving", unspecified | No |
| CloddsBot (about 3.1k stars) | Self hosted Claude terminal over ten venues | Semantic memory and a calibration ledger, with no stated effect on behaviour | No |
| PropsBot | Prediction market prices against sportsbook lines | No | No |
| Foresight Arena (arXiv 2605.00420) | AI agents commit forecasts on Polygon and are scored by Brier against Polymarket | No | Commit and reveal |

**No product outside the hackathon weights sportsbooks, Polymarket and Kalshi by their measured
accuracy.** Kalshi's only agent ("Harrison") is internal.

Skepticism is the backdrop: in Prediction Arena, six frontier models lost an average 22.6% over 57 days
on live Kalshi markets, and fake handicapper records (picks posted after the game) are common. The
standard fix people ask for is picks timestamped before the game, which is Hunch's design.

## 3. Track 1 rivals already score source trust

The prize pool is $4,500: three tracks at $1,000 each ($500, $300, $200), plus three $500 awards (Best
Walrus Memory, Best Tatum AI Builder app, Best Use of Agent Payments). Public Track 1 repos found:

| Rival | Idea | Proof on Sui | Trust mechanic | State seen |
| :--- | :--- | :--- | :--- | :--- |
| Hindsight ([neromtoobad](https://github.com/neromtoobad/hindsight)) | Five AI agents, public prices and humans call the same markets | Each bet mints a `Ticket` with a hash of its reasoning, on mainnet | Brier, credibility and lessons per agent; x402 paid API | Live demo, 26 commits |
| [WalRecall](https://github.com/0x-zeze/WalRecall) | Forecaster credibility matrix feeding a consensus | Checkpoint anchor at intake | Weights bounded 0.40x to 2.40x | Live demo, 86 commits |
| [Walkback](https://github.com/joyboy-sats/walkback) | Market claims from X posts; wrong sources get demoted | Checked against mainnet | Wilson lower bound, muted under 0.40 | Live demo, 29 commits |
| [Veto](https://github.com/SammyCodes1/Veto) | Books against Polymarket; stops logging where the closing line record is poor | A pick counts only after Tatum reads it back before close | Mainnet memory | Live demo, 8 commits |
| [Tuition](https://github.com/valeriusxix/Tuition) | Crypto forecaster that writes a lesson after each miss | Not described | Planned memory on and off test | Scaffold |

Three more (a second Hindsight, MarketRecallAI, SUIX5) showed up only in search snippets.

**The bar for Best Walrus Memory** comes from outside Track 1: TwiceShy, an x402 buying agent, reports
0 wrong answers accepted with memory against 11 without, over 18 rounds, and a wipe and restore test
that recovered all 8 beliefs. A measured before and after beats a claim.

## 4. The Sui ecosystem: proofs are on trend, so they earn trust but not novelty

1. Talus Labs raised over $10M for "AvA Markets", where AI agents compete and users bet; live betting
   was not confirmed.
2. Sui Overflow 2026 (747 projects) rewarded Carry (provable agent memory), Praxis (agent spends logged
   to Walrus) and ContextMeM. Haulout 2025 rewarded TradeArena (AI trading with decisions on Walrus).
3. **DeepBook Predict** is live on mainnet and testnet (since Sept 12, 2026), BTC only, positions from 1
   minute to 1 month, through `@mysten/deepbook-v3/predict` 2.8.0 or later with no indexer. Yosuku
   pairs it with a Walrus Memory module. **No Track 1 entry found uses it.**

## 5. Memory vendors and research: small gains, real risks

1. None of mem0, Letta, Zep and Graphiti, Supermemory, Cognee, Hindsight by Vectorize, LangMem or Walrus
   Memory has a named trading or prediction market customer. Vendor benchmarks are self reported and
   unstable.
2. Forecast-Dojo (Sept 2026, 1,568 resolved Polymarket events): a "belief notebook" memory helped six
   of twelve models and hurt six, with Brier changes under 0.02. Structured memory (ForecastCompass) does
   better than narrative lessons, which favours numeric trust lines per source.
3. Markets are the strongest single source: in Prophet Arena the Kalshi baseline scored 0.187 Brier
   against GPT 5's 0.184, and no model broke even when betting. Weighting forecasters by past
   performance beats a plain crowd (Wharton). The signal is in knowing **which market to trust in which
   category**, which is Hunch's thesis.
4. Known failure modes: look ahead bias in backtests, memory poisoning through ordinary queries (over 95%
   success in MINJA style attacks), and noisy results from small samples.

## 6. Verified records and plain language backtests exist apart

1. Proof of a pick comes in three forms: sportsbook sync (Juice Reel, Pikkit), ledgers that never allow
   a withdrawal (Good Judgment Open, scored by Relative Brier), and cryptographic commitments (Foresight
   Arena, OpenTimestamps, EAS). Hunch is in the third camp.
2. **Power:** Foresight Arena needs about 348 predictions to detect a 0.02 Brier edge over the market at
   80% power, and about 1,392 for 0.01. "Proven" at n ≥ 20 can only be a threshold signal.
3. Plain language backtests are mainstream in equities (Composer, QuantConnect Mia, TrendSpider) and
   missing in prediction markets. Their first result follows one pattern: the rule shown back, a curve
   against a benchmark, summary numbers, then an explanation. That maps onto Hunch's rule card, replay
   and Brier against the market.
4. Charts: one row per source with open, now and history (TeamRankings), and Polymarket's `{t, p}`
   price history at 1h, 6h, 1d and 1w. [build-now.md](build-now.md) §2 builds on both.

## 7. How close anything comes

| Product | Plain words | Replay | Live follow | Signed before lock, anchored | Per source trust in memory, cited |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Hindsight (neromtoobad) | No | Not stated | Partly | Yes, mainnet | Scores agents and prices |
| WalRecall | No | Not stated | Not stated | Checkpoint anchor | Bounded weights |
| TurbineFi | Yes | Yes | Yes | No | No |
| Public | Yes | No | Yes | No | No |
| Foresight Arena | No | No | Rounds | Yes, Polygon | Brier against market, no memory |
| CloddsBot | Chat | Yes | Yes | No | Memory, no stated feedback |
| **Hunch** | **Yes** | **Yes, 7 days** | **Yes** | **Yes, Sui testnet via Tatum** | **Yes, with citation** |

Outside the hackathon, products have either the flow or the proof, never both. Inside it, rivals have
proof and trust without the plain sentence and the replay. Hunch's position is the join.

## 8. What to claim, and what not to

**Claim:** among the products reviewed, no one else joins plain words to a rule, a replay scored by
Brier against the market, picks signed before lock, and cited per source trust in memory, in one
consumer app.

**Don't claim** that trust scoring, on chain pick proofs or memory backed forecasting are new. Track 1
rivals, Foresight Arena, Carry and Praxis already have them.

The build and messaging changes that follow are in [build-now.md](build-now.md) §4.
