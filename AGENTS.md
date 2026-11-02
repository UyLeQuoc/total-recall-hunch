# Agent instructions — Hunch

Hunch is a Track 1 entry (Markets & Sports Prediction) to the Walrus × Tatum "Total Recall" hackathon:
**test your hunch before you bet.** Read [docs/README.md](docs/README.md) first, then the
[PRD](docs/prd.md).

## Before you change anything

- **Scope is the PRD.** P0 is H1–H12 (§7.1); everything else is later. The day-by-day plan is §14.
- **How to write code:** [docs/code-rules.md](docs/code-rules.md).
- **Sui is gRPC only** ([ADR-0002](docs/adr/0002-sui-grpc-only.md)). Never add a JSON-RPC call. Every Sui
  call goes through `@hunch/chain` (Tatum, paced and counted;
  [ADR-0003](docs/adr/0003-tatum-for-every-sui-call.md)).
- **Polling never uses Tatum.** Market data comes from the free sources (PRD §9). Tatum's Prediction
  Market API is off by default.
- **Networks** ([ADR-0005](docs/adr/0005-testnet-for-sui-mainnet-for-memory.md)): Sui on testnet, Walrus
  Memory on mainnet, no real money. Never publish Move to mainnet.
- **Walrus Memory** behaves differently from its docs in places. Read
  [tech-reference §1.11](docs/tech-reference.md#111-field-notes-measured-on-mainnet) before touching
  memory code. Namespaces are built in `@hunch/memory`. The relayer sees plaintext, so nothing private is
  written.
- **The model can't act alone:** it compiles, the user approves, code evaluates. Fetched or pasted text is
  untrusted and is wrapped before the model reads it (PRD §13).

## Decisions → ADRs (required)

Any decision or change of direction gets an ADR in `docs/adr/`, in the **same commit** as the change:
architecture, scope, dependencies or vendors, deploy, workflow, naming and security.
- Copy `docs/adr/0000-template.md` to the next number, add the row to `docs/adr/README.md`, and update the
  docs it affects.
- Never rewrite an accepted ADR. Supersede it with a new one.

## Workflow

- One `main`. Before pushing:
  `git pull --rebase origin main && bun run typecheck && bun run lint && bun run test && bun run docs:links`,
  plus `sui move test` in `packages/move/hunch` when Move changes. Then `git push origin HEAD:main`.
- Commit messages start with the PRD's requirement IDs, e.g. `[H1·api] Compile a hunch into a rule`.
- Never:
  - commit secrets or `.env` values;
  - force-push;
  - deploy, or make the repo public, without the owner's go
    ([ADR-0006](docs/adr/0006-mit-private-until-submission.md));
  - use a real person's wallet or account for tests (use test keys).
