# The showreel

A 120-second motion piece about Hunch, rendered from code in Hunch's own look: ASCII motion on the site's
paper, ink, Inter and Geist Mono ([ADR-0019](../../docs/adr/0019-showreel-in-hunchs-own-look.md)). It runs
60 bars at 120 BPM on a score synthesised in code. The output is `out/hunch.mp4`: 1920×1080, 60 fps, AAC
audio.

```bash
bun data.ts                    # measure everything on screen → .build/data.json (live API + bun run test)
bun shots.ts                   # real screens of testyourhunch.vercel.app → .build/shots
bun render.ts                  # → out/hunch.mp4
bun render.ts --stills 20,53   # review frames → .build/stills
```

| File               | Job                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| `data.ts`          | Reads the live API and counts the tests from `bun run test`                                      |
| `shots.ts`         | Captures the live site for the screen wall                                                       |
| `score.ts`         | The music: A minor at 120 BPM, with sections that follow the picture                             |
| `sfx.ts`           | Synthesised sound effects, placed by the cues the scenes declare                                 |
| `render.ts`        | Bundles `film/`, steps time frame by frame in Chromium, encodes, mixes the score and the effects |
| `film/main.ts`     | The timeline: 14 acts on 60 bars, block-dissolve and flash cuts, the HUD                         |
| `film/ascii.ts`    | The character grid: noise, glyph masks, the lit sphere, the cube                                 |
| `film/scenes-a.ts` | The hunch, wins stick, the title, three prices, tonight's board                                  |
| `film/scenes-b.ts` | Say it, the replay, on record, no hiding                                                         |
| `film/scenes-c.ts` | Walrus Memory and the scores, learning and the cited call, Proven, under the hood, the end       |
| `film/kit.ts`      | Acts, decoding text, sparklines, ASCII bars, the palette                                         |
| `film/lib.ts`      | Beat grid, easing, seeded randomness, DOM helpers, the sound cue sheet                           |
| `film/index.html`  | The 1920×1080 stage and every style                                                              |

`data.ts` reads these from the live API:

- the demo hunch's compile and replay;
- tonight's board and its price series;
- the learning curve, the voices, and the memory lines with their blobs;
- the status counts;
- one proof.

The rest of this page is how the film stays true:

- **Deterministic:** every frame is `render(t)`. Nothing reads the clock or `Math.random`.
- **Honest:** every number comes from `.build/data.json`.
  - The replay is labelled "practice, not record".
  - The proof on screen is a pick made with a test delegation. It verifies like any other pick, and
    scoring leaves it out.
