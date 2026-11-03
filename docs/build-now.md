# What to build now (Nov 3 to Nov 9)

| Field      | Value                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| **Date**   | Nov 3, 2026 (six days before the planned submission on Nov 9; the hard deadline is Nov 10, 17:00 UTC)        |
| **From**   | Harry Phan, after the review in [product-feedback.md](product-feedback.md)                                   |
| **Status** | Proposed. The owner picks what goes in; each accepted change gets an ADR (AGENTS.md)                        |

[product-feedback.md](product-feedback.md) says what Hunch should feel like. This doc turns it into a
build list for the six days that are left, and adds one thing the demo is missing: **showing the
prices**. Today the app has the numbers, but it never draws the moment a hunch is about: two sources
disagreeing, the gap crossing the rule's line, and the pick landing before the lock.

Everything stays in the look of [ADR-0009](adr/0009-the-look.md): one prompt column, every chart drawn
in ASCII, built from `apps/web/src/lib/ascii/`.

## 1. What exists today

| Surface | What it draws | Where |
| :--- | :--- | :--- |
| Tonight's board | Each source's home price and an 8 character sparkline of its last 24 snapshots | `features/games/games-page.tsx:29`, `ingest/board.ts:7` |
| Research card | Today's prices from each source, side by side as meters | `features/games/research-card.tsx:40` |
| Replay | Picks per day (right and wrong) and Brier of the rule against its market | `components/replay-view.tsx:33` |
| BTC practice | One minute candles, with the entry price marked | `features/hunch/practice-turn.tsx:34` |
| Learning | Each voice's score over time as a line chart | `features/learning/learning-page.tsx:26` |
| Thinking | A radar frame while the hunch compiles | `features/hunch/thinking.tsx` |

The data behind a real price chart is already stored: `snapshots (event_id, source, home_prob, at,
kind)` keeps every price from every source (`apps/api/src/db/migrate.ts:20`). Nothing reads it back as a
time series per game, except the 24 points behind each sparkline.

**A bug to fix before any new chart:** `lineChart` (`lib/ascii/lines.ts`) spreads each series over the
full width on its own, and the learning page drops `null` points before passing them in
(`learning-page.tsx:31`). Two series with different gaps are drawn on different time scales, so their
lines look aligned when they are not. Every chart below needs the series aligned to the same time
buckets first, with gaps kept as gaps.

## 2. The price charts to add

The numbers in these mockups are made up to show the layout. The real charts draw only stored data.

### 2.1 Line movement: every source on one game (new, highest value)

Under the research card and under every pick: the home win probability from each source over the last
24 hours, on one time axis, with the pick and the lock marked.

```text
DET to win · PHI @ DET · tip-off 23:10 UTC

 56% ┤                              ●●●●●●
     │                     ●●●●●●●●●      ○○
     │          ●●●●●●●●●●●        ○○○○○○○  ○○
     │ ●●●●●●●●●            ○○○○○○○         ◆◆
 49% ┤ ○○○○○○○○○○○○○○○○○○○○              ◆◆◆
     └──────────────────────────────────────┬──┬──
       05:00         11:00         17:00    ▲  │
                                         pick  lock
     ● the books   ○ Polymarket   ◆ Kalshi
```

**Why it matters:** this is the hunch, seen. A judge sees the books and Polymarket split, then sees
the pick land before the lock, without reading any text.

**To build:**

1. `GET /api/games/:id/prices?hours=24`: snapshots bucketed to 15 minutes per source, carrying the
   last price forward inside a bucket and leaving `null` where a source has no price yet.
2. A `timeChart` in `lib/ascii/` that takes aligned buckets, draws `null` as a gap, and puts markers on
   the x axis (pick, lock, anchored).
3. Use it in the research card, on the pick in **your record**, and on `/p/<id>` (the proof page), where
   the pick marker shows the prices the pick says it saw (`payload.seen`).

**Done when:** the three lines on one game share one time axis, and the pick marker sits at the time in
the signed payload.

### 2.2 The gap against the rule's line (new)

For a gap rule ("when the books and Polymarket disagree by 2 or more points"), draw the gap itself, with
the rule's threshold as a line. The part above the line is when the hunch fires.

```text
books minus Polymarket, in points · your rule fires at 2.0

 +4 ┤               ▄▄█▄
    │           ▄▄▄█████▄▄          ▄▄
 +2 ┼ ─ ─ ─ ─ ─█████████████─ ─ ─ ─███─ ─ ─   ← your rule
    │      ▄▄███████████████████▄▄▄█████▄
  0 ┤▄▄▄▄████████████████████████████████████
    └─────────────────────────────────────────
     05:00         11:00         17:00
     fired 2 times today · picked once (the other came after lock)
```

**Why it matters:** it shows why the rule fired or didn't (H4's "why it did or didn't fire"), in one
picture instead of the log in `fires`.

**To build:** compute the gap from the same buckets as 2.1, and reuse `bars.ts` for the columns plus a
dashed row at the threshold. Use it on the rule page and in the first answer after a hunch compiles.

### 2.3 Replay: the rule against its market over time (extends the replay)

Today's replay shows per day bars and one Brier number for each side. Add the running Brier of the rule
next to the running Brier of the market it bets against, on the same picks, so "beats the market" is a
line staying under another line, not a single number.

```text
Running Brier (lower is better) · 6 picks over 7 days

 0.30 ┤ ○○
      │   ○○○○  ○○○○○○○○○○○○○○○○○○  ○ Polymarket on the same games
      │ ●●    ○○
 0.20 ┤   ●●●●●●●●●●●●●●●●●●●●●●●●  ● your rule
      └────────────────────────────
       Oct 27              Nov 2
      early evidence: 6 picks, Proven needs 20
```

**Done when:** the last points of both lines equal the two Brier numbers the replay already prints.

### 2.4 Who to trust, under the call (moves the learning chart to where it counts)

The learning page already draws each voice over time. Under the agent's call on the research card, add
the small version: each source's trust weight now, its sample size, and what the call would be with a
plain average.

```text
Hunch leans DET 54%

 the books    ████████████░░░░  0.21 Brier · 63 games
 Polymarket   ██████████████░░  0.19 Brier · 63 games   ← trusted most
 Kalshi       ████████░░░░░░░░  0.24 Brier · 41 games

 weighted 54% · plain average 52% · from memory written Nov 2, 06:00 UTC  [why this call]
```

**Done when:** each bar links to the Walrus Memory line it came from, and the "plain average" number is
computed, not copied.

### 2.5 BTC: keep the candles, mark the scoring window

The practice candles stay. Add the five minute window as two markers on the x axis (entry and
scoring), so the viewer sees the exact candle the pick was scored on.

### 2.6 The proof as a timeline

On the pick and on `/p/<id>`: one row showing the order of events, which is the whole claim of the
proof.

```text
picked 22:31 ──── anchored 22:40 ──── lock 23:10 ──── final 01:52 ──── scored 06:00
       ✓ signed          ✓ on Sui            ✓ before lock          ✓ won · Brier 0.18
```

If the anchor lands after the lock, the row says so in plain words (product-feedback §6).

## 3. The build list, in order

Each day ends with something a judge could see. The PRD's plan (§14) is the baseline; this reorders the
last six days around the loop in product-feedback §10.

| Day | Build | Done when |
| :--- | :--- | :--- |
| **Nov 3** | The "fix now" items in product-feedback §11 that touch today's record (Slush verify, Undo, duplicate picks, the Polymarket home side, picks after tip-off). Get the Senate and tonight's NBA picks on record | The picks made today verify, with no duplicates |
| **Nov 4** | The aligned time buckets and `GET /api/games/:id/prices`; the line movement chart (2.1) on the research card and the proof page | A pick's marker sits at its signed time on a three source chart |
| **Nov 5** | One sentence starts following: no "Put it on record" step for observing (product-feedback §1 to §3). The "what happens next" line. The gap chart (2.2) in the first answer | A new hunch says what it is watching, and the gap chart shows when it fires |
| **Nov 6** | Trust under the call (2.4), weighted against plain average, each bar citing its memory line (product-feedback §4 and §5) | A call cites the memory that moved it, or says the memory didn't change it |
| **Nov 7** | The running Brier replay (2.3), the proof timeline (2.6), the BTC window (2.5). Record the video | The demo flow in product-feedback §10 runs end to end on real records |
| **Nov 8** | The "before submission" fixes in product-feedback §11, the README's Submission section, the blog post and the X post | Published |
| **Nov 9** | Submit | The form is in |

**Not now:** trading on DeepBook Predict (H13), more markets, paper positions. They add scope without
making the core loop easier to believe.

## 4. What the competitive research changes

[landscape.md](landscape.md) has the full picture. Five findings change this plan:

1. **Learned source trust alone is not enough to stand out.** At least nine public Track 1 repos already
   rank their sources (Walkback, WalRecall, Hindsight and others). What no one else ships is the whole
   loop: a plain sentence, a replay, following it live, picks signed before lock, and the call citing the
   memory that moved it. So the demo leads with the loop and the price charts in §2, not with the trust
   scores.
2. **"Proven" at n ≥ 20 can't establish an edge.** Foresight Arena's power analysis (arXiv 2605.00420)
   needs about 348 predictions to detect a 0.02 Brier edge at 80% power. Keep the badge, but show the
   sample size and an interval next to it, and call anything under that "early evidence", as
   product-feedback §7 already asks.
3. **Small samples and memory poisoning are the known failure modes.** Shrink each source's trust toward
   a prior until it has enough resolutions, and always print the sample count (chart 2.4 does). Write a
   trust line only from a verified resolution, with the resolution's provenance in the line.
4. **Most rivals anchor on Sui mainnet; Hunch uses testnet** ([ADR-0005](adr/0005-testnet-for-sui-mainnet-for-memory.md)).
   The submission should say why in one line (no real money, picks are signatures) so judges don't read
   it as a gap.
5. **No Track 1 entry found uses DeepBook Predict.** Trading stays out of scope, but DeepBook Predict's BTC
   price is a possible extra source for BTC hunches, read only, if a day frees up.

## 5. Checklist

**Charts:**

1. [ ] Align series to shared time buckets, with gaps kept as gaps (fixes the learning chart too).
2. [ ] `GET /api/games/:id/prices?hours=24`, bucketed to 15 minutes per source.
3. [ ] `timeChart` with x axis markers (pick, lock, anchored).
4. [ ] Line movement on the research card, the pick, and the proof page.
5. [ ] The gap chart with the rule's threshold, on the rule page and in the first answer.
6. [ ] The running Brier replay, ending on the same numbers the replay prints today.
7. [ ] Trust under the call: weights, sample sizes, weighted against plain average, linked to memory.
8. [ ] The BTC scoring window on the candles.
9. [ ] The proof timeline on the pick and on `/p/<id>`.
10. [ ] Every chart has a text equivalent for screen readers (`ascii-art.tsx` uses `role="img"` today).

**The loop (from product-feedback §10):**

1. [ ] One sentence → replay → following on its own.
2. [ ] One real pick whose proof is read back through Tatum, shown on the line movement chart.
3. [ ] Result → memory on Walrus → the next call cites it.
4. [ ] Replay, live observation, signed pick and proof before lock are told apart everywhere.
5. [ ] One complete, verified record ready for the demo.

**From the research (§4):**

1. [ ] "Proven" shows its sample size and an interval; under the power threshold it reads "early evidence".
2. [ ] Trust is shrunk toward a prior until a source has enough resolutions, and the count is shown.
3. [ ] Trust lines are written only from verified resolutions, with provenance.
4. [ ] The README says in one line why anchors are on testnet.
