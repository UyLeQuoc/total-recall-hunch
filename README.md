# Hunch

**Test your hunch before you bet.** Say it, Hunch tests it, Sui proves it, memory learns who to trust.

Everyone who bets or forecasts has hunches, like "Polymarket overprices NBA favourites." Almost nobody
tests them honestly. Hunch turns a hunch into a rule you can read, replays it, then puts it **on record**:
every pick is logged before lock with a proof on Sui, every morning every voice is scored, and Walrus
Memory keeps who was right, on what. A rule that beats the market it bet against earns **Proven**.

A Track 1 entry (Markets & Sports Prediction) to the
[Walrus × Tatum "Total Recall" hackathon](https://recall-tatum-walrus.vercel.app). Not a sportsbook: no
deposits, no wagering, no real money.

## Status (Nov 2, 2026)

The whole happy path runs on real data (PRD §5). What waits for the owner's keys is marked.

| Step   | What runs                                                                                              | Notes                                                                                                                                                                            |
| ------ | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–2    | Say a hunch: rule card + 7-day replay against the books, Polymarket and Kalshi (NBA) or Coinbase (BTC) | Any wording with `OPENROUTER_API_KEY`; the example shapes without it ([ADR-0008](docs/adr/0008-first-runnable-slice.md))                                                         |
| 3–4    | **See one scored now:** a BTC practice pick, scored 5 minutes later                                    |                                                                                                                                                                                  |
| 5      | Sign in once: a Sui wallet or a browser test key signs the delegation                                  | `bun run keys:dev` writes Hunch's test agent key ([ADR-0011](docs/adr/0011-picks-on-record.md))                                                                                  |
| 6–8    | Put it on record; the monitor fires before tip-off, signs the pick, notifies with Undo                 | Picks by hand on **tonight** too; late picks get 409                                                                                                                             |
| 9      | Research card: every source side by side, splits flagged, the agent's call citing its memory           |                                                                                                                                                                                  |
| 10, 12 | Resolve, score every voice, trust lines for Walrus Memory; the call leans on them                      | Lines queue in Postgres until `MEMWAL_*` is set ([ADR-0012](docs/adr/0012-scoring-and-trust-memory.md))                                                                          |
| 11     | `/p/<id>`: hash, signatures, delegation, Merkle proof, anchor read back from Sui                       | Verified on a localnet; testnet needs a funded `SUI_SPONSOR_KEY`, `TATUM_API_KEY_TESTNET` and `bun run anchor:publish` ([ADR-0010](docs/adr/0010-anchor-module-and-localnet.md)) |
| 13     | Proven per version (n ≥ 20, better Brier than its market), scorecards, the learning chart              |                                                                                                                                                                                  |
| 14     | Trading on DeepBook Predict (P1) and the Predict spike (H12)                                           | Not built: needs test USDC                                                                                                                                                       |

The look: one prompt column, every chart drawn in ASCII ([ADR-0009](docs/adr/0009-the-look.md)).

## Layout

```
apps/api          Hono API + worker loops: ingest, compiler, monitor, anchor (sign, batch, verify),
                  score (voices, trust, Proven), memory (queue → Walrus), auth (delegation)
apps/web          React: hunch, tonight, learning, status, your record, rule and proof pages;
                  ASCII charts in src/lib/ascii
packages/chain    @hunch/chain: Tatum Sui gRPC client, pacing, credit counting, 402 fallback, logger
packages/memory   @hunch/memory: Walrus Memory namespaces, limiter, account reads, sign-in
packages/move     hunch::anchor (one event per Merkle batch)
docs/             PRD, ADRs, tech reference, code rules, event rules
```

## Develop

Needs Bun 1.3.14, Node 24 and Docker.

```bash
bun install
cp .env.example .env     # every key is optional; see the table above for what each unlocks
bun run keys:dev         # a test agent key, so picks can go on record
bun run db:up            # Postgres on localhost:5437
bun run dev              # API on :8787, web on http://localhost:5290
```

The first start backfills the last 7 days (about a minute). Without `OPENROUTER_API_KEY`, hunches
shaped like the three examples compile; with it, any wording does.

Checks: `bun run typecheck && bun run lint && bun run test && bun run docs:links`.

Agents: read [AGENTS.md](AGENTS.md).

## License

[MIT](LICENSE)
