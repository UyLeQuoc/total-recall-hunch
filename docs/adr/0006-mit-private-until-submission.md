# ADR-0006: MIT; the repo stays private until submission, and its history is scanned before it opens

- **Status:** Accepted
- **Date:** 2026-11-02
- **Deciders:** Uy

## Context

- **The submission needs a public repo,** by Nov 10, 17:00 UTC.
- **Keys sit in `.env`** during development: Tatum, the Walrus Memory delegate key, the sponsor key and
  the model's key.

## Decision

- **License: MIT** (`LICENSE`).
- **The GitHub repo is private until submission day.**
- **Before it goes public, `bun run secrets:history` must pass.** It checks every line ever added, on
  every branch, for secret-shaped strings and committed `.env` files.
- **CI fails if an `.env` file is tracked.**

## Consequences

- **Nobody outside the team sees the work in progress.**
- **Making it public is one step on Nov 9,** after the scan.

## Links

`scripts/scan-history.ts` · [event rules](../event-rules.md)
