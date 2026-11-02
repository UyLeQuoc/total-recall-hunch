# ADR-0007: The repo is public from Nov 2, a week before submission

- **Status:** Accepted
- **Date:** 2026-11-02
- **Deciders:** Uy

## Context

- **[ADR-0006](0006-mit-private-until-submission.md) kept the repo private until submission day,** with
  one step to open it on Nov 9, after the history scan.
- **On Nov 2 the owner decided to open it now.**
- **The scan passed on Nov 2:** `bun run secrets:history` found nothing secret-shaped in 1 commit and
  4,597 added lines, and no `.env` file was ever committed.

## Decision

- **The GitHub repo is public from Nov 2.** This supersedes ADR-0006's "private until submission day".
- **The rest of ADR-0006 stands:** the license is MIT, and CI fails if an `.env` file is tracked.

## Consequences

- **Anyone can see the work in progress,** including the PRD and the plan.
- **Every push is public the moment it lands.** A key pushed by mistake must be rotated, not just removed
  from history: it has already been seen.
- **Follow-up:** consider running `bun run secrets:history` in CI, now that there's no scan before
  opening.

## Links

[ADR-0006](0006-mit-private-until-submission.md) · `scripts/scan-history.ts` ·
[event rules](../event-rules.md)
