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
