# ADR-0002: Sui is gRPC only: native gRPC through Tatum on the server, gRPC-web in the browser

- **Status:** Accepted
- **Date:** 2026-11-02
- **Deciders:** Uy

## Context

- **Sui deprecated JSON-RPC.** Public fullnodes reject `sui_*` and `suix_*` calls, and Tatum's testnet
  gateway doesn't offer JSON-RPC at all.
- **Tatum serves native gRPC** (`application/grpc`) at `https://sui-<network>-grpc.gateway.tatum.io`, with
  the API key as `x-api-key` metadata. `SuiGrpcClient` defaults to gRPC-web and fails against it.
- **gRPC has no "query events by type" or "transactions by address".**

## Decision

- **Never add a JSON-RPC call.**
- **Server side:** `createTatumSuiClient` in `@hunch/chain` gives `SuiGrpcClient` a native transport
  (`@protobuf-ts/grpc-transport` + `@grpc/grpc-js`).
- **Browser:** gRPC-web against `https://fullnode.<network>.sui.io:443`, or through the API.
- **History comes from what Hunch wrote.** It knows its own digests and reads them with `GetTransaction`.
  A screen that needs live fills may open a filtered `SubscribeCheckpoints` stream (opt-in, PRD §11).
- **SDKs that take a client** (`@mysten/deepbook-v3`) get the Tatum `SuiGrpcClient`, so their calls go
  through Tatum too.

## Consequences

- **Every Sui call is countable** in one place ([ADR-0003](0003-tatum-for-every-sui-call.md)).
- **No event queries:** a feature that needs another party's history needs its own design first.

## Links

[tech reference §2.2](../tech-reference.md#22-sui-rpc-gateway-grpc-only-adr-0002) ·
https://docs.tatum.io/docs/sui-migration-guide-from-json-rpc-to-grpc
