# @hunch/memory

Walrus Memory for Hunch, on mainnet ([ADR-0005](../../docs/adr/0005-testnet-for-sui-mainnet-for-memory.md)).
What goes in each namespace is in [the PRD §10](../../docs/prd.md#10-walrus-memory).

- `NAMESPACE`: `rules:<user>`, `picks:<user>`, `trust:public`, `radar:public`.
- `scope(operator, namespace)` and `createClient(scope)`: a `MemWal` client for one namespace. Use
  `rememberBulk` (up to 20 a call) with an `idempotencyKey` per snapshot, and
  `recall({ query, namespace, sort: "recent", limit })` for the agent's weights.
- `limiterFor(key)` / `runLimited`: one rate limiter per delegate key (the relayer allows about 60
  weighted requests a minute), retrying 429s and transient errors.
- `readOperatorEnv()`: `MEMWAL_ACCOUNT_ID`, `MEMWAL_PRIVATE_KEY`, `MEMWAL_SERVER_URL`,
  `MEMWAL_PACKAGE_ID`, `MEMWAL_REGISTRY_ID`. A blank value counts as unset (`withoutBlanks`).
- `readAccount`, `isDelegateRegistered`, `findAccountIdForOwner`: the account and its delegate keys,
  read over gRPC.
- `createAccountTx`, `addDelegateKeyTx`, `executeAccountTx`: account set-up, sponsored by the relayer
  when it will, paid by the keypair when it won't.
- `signInMessage`, `addressFromSignature`: wallet sign-in. An address only ever comes from a signature.
- `redactCredentials`: strips keys and tokens before anything is written. The relayer sees plaintext.
- `formatUntrustedMemories`: recalled lines go to the model as untrusted data behind a nonce.

The relayer's behaviour, as measured, is in [docs/tech-reference.md](../../docs/tech-reference.md).
`registry.test.ts` reads the real account when `.env` has one, and skips itself otherwise.
