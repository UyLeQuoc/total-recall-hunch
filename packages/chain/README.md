# @hunch/chain

The typed Tatum client for Sui. **gRPC only** ([ADR-0002](../../docs/adr/0002-sui-grpc-only.md)): the
server uses Tatum's native gRPC gateway with the API key as `x-api-key` metadata.

- `createTatumSuiClient({ network, apiKey })`: a `SuiGrpcClient` on Tatum, paced and metered
  ([ADR-0003](../../docs/adr/0003-tatum-for-every-sui-call.md)), with the public fullnode as the fallback
  while Tatum answers 402 ([ADR-0004](../../docs/adr/0004-public-fullnode-fallback-on-402.md)).
- `tatumSuiOptionsFromEnv(network)`: reads `TATUM_API_KEY[_TESTNET]`, `TATUM_SUI_GRPC[_TESTNET]` and
  `SUI_GRPC_FALLBACK[_TESTNET]`.
- `PacedTransport`: 3 unary calls a second by default, retries Tatum's 429s, and counts every call and
  stream frame by method (`tatumUsage`), for the credit meter (PRD H11).
- `suiFallback(network)`: whether calls go to the fallback right now, for health.
- `readFunds(client, owner, coinType)`: an address balance and its coins, from one `GetBalance`.
- `withRetry(fn)`: retries transport errors only.
- `createLogger`, `redact`, `withLogContext`: JSON-lines logs that never print secrets.
