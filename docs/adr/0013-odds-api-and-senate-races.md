# ADR-0013: More books through The Odds API, and the Senate races from Polymarket and Kalshi

- **Status:** Accepted
- **Date:** 2026-11-02
- **Deciders:** Uy ("thêm The Odds API cho nhiều nhà cái … làm nốt đi")

## Context

- **The books were DraftKings only,** through ESPN. The owner asked for more bookmakers; the PRD lists
  The Odds API as H20 (P2), and this pulls it forward.
- **The Odds API costs credits:** 500 a month on the free plan; one `h2h` call for up to 10 named
  bookmakers costs one. No key is in `.env` yet.
- **H6 asks for the midterm races** with prices from ≥ 2 sources, and the election is on Nov 3. The books
  don't price them. Both markets do, in a shape that matches (probed Nov 2):
  - Kalshi: `SENATE<ST>-26` (and `SENATE<ST>S-26` for the Ohio and Florida specials), a `-D` and a `-R`
    market each; `GET /markets?tickers=…` reads them all in one call;
  - Polymarket: `<state>-senate-election-winner`, with a "(D)" and an "(R)" market.
- **34 races matched;** 30 have both sources. On Nov 2 Louisiana was 8.3 points apart (Polymarket 12.5,
  Kalshi 4.2 for the Democrat) and four more about 2.

## Decision

- **The Odds API** (`ODDS_API_KEY`, optional): `basketball_nba/odds`, `h2h`, American odds, for
  DraftKings, FanDuel, BetMGM, Caesars, Pinnacle and Betfair. At most one call every 30 minutes, only
  while a game locks within 3 hours, and at most `ODDS_API_DAILY_CALLS` (12) a day: about 360 credits in
  a month. Calls and the remaining credits are counted (`odds_api_usage`) and shown on status.
- **Each book is its own source** (`book:<key>`), stored as a snapshot and scored as its own voice.
  **`books` stays one source for rules:** the average of the fresh book quotes, vig removed (DraftKings
  from ESPN counted once). Without a key it is DraftKings alone, as before. The replay's backfill still
  reads DraftKings' closing line.
- **The Senate races** are events (`senate:<Kalshi event>`, league `SENATE`): "home" is the Democrat,
  "away" the Republican. Kalshi's and Polymarket's prices are normalised to the Democrat's chance. Every
  race **locks when the first polls close, Nov 3 at 23:00 UTC (6 pm ET)**, one conservative time for all.
  A race resolves from either market's own result (Kalshi's `result`, or Polymarket's closed market at
  1/0), as the PRD says (§6.5).
- **Rules may name `SENATE`** with Polymarket and Kalshi; a Senate rule that names the books is refused.
  The example hunch is the PRD's again, at 2+ points: "On Senate races, Kalshi is sharper than Polymarket
  when they split by 2+ points."
- **Trust has a context:** "NBA moneyline" or "Senate race", one line per voice and context.

## Consequences

- **Tonight's page shows both.** Picks on a Senate race are refused after 23:00 UTC on Nov 3.
- **A Senate rule's replay has no past races yet;** its record starts on election night.
- **With a key,** each game's research card lists every book under the consensus, and the learning page
  scores them one by one.

## Links

[PRD §6.1, §9, H6, H20](../prd.md) · [ADR-0008](0008-first-runnable-slice.md) ·
[ADR-0012](0012-scoring-and-trust-memory.md)
