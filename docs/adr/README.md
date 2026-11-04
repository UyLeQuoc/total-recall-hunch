# Architecture decisions

Copy [0000-template.md](0000-template.md) to the next number, add a row here, and commit it with the
change it decides. Never rewrite an accepted ADR; supersede it with a new one.

| ADR                                                | Decision                                                                                                                        | Status                                          |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| [0001](0001-repo-stack-and-layout.md)              | One Bun monorepo; `@hunch/chain` and `@hunch/memory` copied in from the team's tested code; apps and the Move package come next | Accepted                                        |
| [0002](0002-sui-grpc-only.md)                      | Sui is gRPC only: native gRPC through Tatum on the server, gRPC-web in the browser                                              | Accepted                                        |
| [0003](0003-tatum-for-every-sui-call.md)           | Tatum carries every Sui call, paced and counted; polling uses free sources; the Prediction Market API is off by default         | Accepted                                        |
| [0004](0004-public-fullnode-fallback-on-402.md)    | When Tatum answers 402, Sui calls go to the public fullnode for a 10-minute cool-down                                           | Accepted                                        |
| [0005](0005-testnet-for-sui-mainnet-for-memory.md) | Sui work on testnet, Walrus Memory on mainnet, no real money                                                                    | Accepted                                        |
| [0006](0006-mit-private-until-submission.md)       | MIT; private until submission; history scanned before it opens                                                                  | Superseded by [0007](0007-public-from-nov-2.md) |
| [0007](0007-public-from-nov-2.md)                  | The repo is public from Nov 2, a week before submission; supersedes 0006's "private until submission"                           | Accepted                                        |
| [0008](0008-first-runnable-slice.md)               | The first runnable slice: `apps/api` and `apps/web`, NBA and BTC on real data, the pattern compiler without a model key         | Accepted                                        |
| [0009](0009-the-look.md)                           | The look: one prompt column like visual-agent-chat, every chart drawn in ASCII like ascii.rest                                  | Accepted                                        |
| [0010](0010-anchor-module-and-localnet.md)         | `hunch::anchor` emits one event per batch; a localnet for tests; the testnet publish waits for the owner's keys                 | Accepted                                        |
| [0011](0011-picks-on-record.md)                    | Picks on record: one signed delegation, picks signed by Hunch's agent, Merkle batches anchored on Sui, a verify page            | Accepted                                        |
| [0012](0012-scoring-and-trust-memory.md)           | Scoring every voice, trust lines queued in Postgres for Walrus Memory, the agent's cited call, Proven, the learning chart       | Accepted                                        |
| [0013](0013-odds-api-and-senate-races.md)          | More books through The Odds API (each a voice, `books` their consensus); the Senate races from Polymarket and Kalshi            | Accepted                                        |
| [0014](0014-predict-spike.md)                      | The Predict spike: a testnet-only script on `@mysten/deepbook-v3` 2.8.0, plan → enqueue → fill → settlement                     | Accepted                                        |
| [0015](0015-local-end-to-end.md)                   | `bun run localnet`: a throwaway localnet, a test sponsor and the anchor package in `.env`, batches every minute                 | Accepted                                        |
| [0016](0016-deploy-railway-and-vercel.md)          | The API on Railway (Docker, Postgres), the web on Vercel at testyourhunch.vercel.app, `/api` rewritten to Railway               | Accepted                                        |
| [0017](0017-railway-footprint.md)                  | A small Railway footprint: Postgres sized to a 10 MB database, a 4-connection pool, Bun with `--smol`                           | Accepted                                        |
| [0018](0018-demo-film-from-code.md)                | The demo film is rendered from code in `apps/video`, on numbers measured from the live API and screens from the live site       | Accepted; look and sound superseded by 0019     |
| [0019](0019-showreel-in-hunchs-own-look.md)        | The showreel in Hunch's own look: ASCII motion on the site's tokens, 120 s on a score synthesised in code, no Mira assets       | Accepted                                        |
| [0020](0020-record-integrity.md)                   | One pick per game enforced in Postgres, Undo is final for a rule, anchors back off, Postgres in CI                              | Proposed                                        |
