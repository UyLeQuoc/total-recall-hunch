# ADR-0018: The demo film is rendered from code, on measured numbers

- **Status:** Accepted; the look and the sound are superseded by [ADR-0019](0019-showreel-in-hunchs-own-look.md)
- **Date:** 2026-11-04
- **Deciders:** Uy ("vidoe của hunch kìa")

## Context

- **The submission needs a 2–3 minute video** ([event rules §4](../event-rules.md)). PRD §15 has the
  script.
- **A screen recording** of a live site is slow to watch. It's also hard to re-cut when the numbers move,
  and they move every night.
- **Mira's showreel** (the team's Track 3 entry) is already rendered from code: an HTML stage stepped
  frame by frame in headless Chromium, then encoded with ffmpeg.
- **The PRD's demo hunch fires 0 times on the last 7 days of stored prices.** The rule is "the books and
  Polymarket split by 5+ points" (measured Nov 4: 51 games, 0 fires). At 1+ point, the same rule fires 24
  times and is right 15 times, with a Brier of 0.205 against Polymarket's 0.207.

## Decision

- **A new workspace, `apps/video`,** renders `apps/video/out/hunch.mp4` at 1080p60. It has three steps:
  1. **`bun data.ts`** measures everything the film shows, into `.build/data.json`. It reads from the live
     API:
     - the compile and replay of the demo hunch;
     - tonight's board;
     - the learning curve and the memory lines;
     - the status counts;
     - one pick's proof.

     It also counts the tests from `bun run test`.
  2. **`bun shots.ts`** captures real screens of testyourhunch.vercel.app for the montage.
  3. **`bun render.ts`** bundles `film/` with `Bun.build` and steps `render(t)` frame by frame in Chromium
     (Playwright 1.64.1). ffmpeg then mixes the music bed with sound effects synthesised in code.
- **The demo hunch is the 1+ point split,** because it fires on real data. The film shows the replay as
  "practice, not record".
- **Every number on screen is measured.** Nothing is typed in by hand: re-running `data.ts` re-films the
  current state.
- **Nothing reaches the record or Walrus Memory.** Compiling the demo hunch saves a practice draft, the
  same as any visitor's. The pick on the verify page (`p_0q47076d2o6c5t5e`) was made with a test
  delegation. It verifies like any other pick, and scoring leaves it out.
- **The look is Hunch's own:**
  - Inter and Geist Mono, from `@fontsource`;
  - the site's paper and ink;
  - ASCII bars;
  - cuts on the beat.
- **The music bed is Mira's,** `assets/audio/bed.mp3`, built from GarageBand Apple Loops. The pop, whoosh
  and ding come from the same place.
- **Build output and the video aren't committed** (`apps/video/.build/`, `apps/video/out/`).

## Consequences

- **Re-rendering** takes a few minutes and needs ffmpeg and Playwright's Chromium.
- **The film carries its story in type.** A voice-over is separate work.
- **The film shares its music with Mira's showreel.** Swap `bed.mp3` and update `BEAT` in `film/lib.ts`
  to change it.

## Links

[apps/video/README.md](../../apps/video/README.md) · [PRD §15](../prd.md#15-the-demo-230) ·
[ADR-0011](0011-picks-on-record.md) · [ADR-0012](0012-scoring-and-trust-memory.md)
