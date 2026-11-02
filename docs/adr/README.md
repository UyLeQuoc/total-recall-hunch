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
