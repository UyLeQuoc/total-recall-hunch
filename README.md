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

- **Ready:** the [PRD](docs/prd.md), the decisions ([docs/adr](docs/adr/README.md)), and two packages:
  - [`@hunch/chain`](packages/chain/README.md): Sui over Tatum's native gRPC, paced and counted, with
    the public fullnode as the fallback while Tatum answers 402;
  - [`@hunch/memory`](packages/memory/README.md): Walrus Memory with Hunch's namespaces.
- **Next** ([PRD §14](docs/prd.md#14-plan-and-milestones)): `hunch::anchor` on testnet, the pick form
  and the free data sources, then the compiler, the monitor and scoring.

## Layout

```
apps/             api (Hono: API + worker loops) and web (React), coming next
packages/chain    @hunch/chain: Tatum Sui gRPC client, pacing, credit counting, 402 fallback, logger
packages/memory   @hunch/memory: Walrus Memory namespaces, limiter, account reads, sign-in
packages/move     hunch::anchor, coming next
docs/             PRD, ADRs, tech reference, code rules, event rules
```

## Develop

Needs Bun 1.3.14, Node 24 and Docker.

```bash
bun install
cp .env.example .env     # fill in Tatum, Walrus Memory and the sponsor key
bun run db:up            # Postgres on localhost:5437
bun run typecheck && bun run lint && bun run test
```

Agents: read [AGENTS.md](AGENTS.md).

## License

[MIT](LICENSE)
