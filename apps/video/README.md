# The film

Hunch's demo film is a motion piece rendered from code ([ADR-0018](../../docs/adr/0018-demo-film-from-code.md)).
It runs 55 bars of the music bed at 99.4 BPM, about 2:13, with every cut on a beat. The output is
`out/hunch.mp4`: 1920×1080, 60 fps, AAC audio.

```bash
bun data.ts                    # measure everything on screen → .build/data.json (live API + bun run test)
bun shots.ts                   # real screens of testyourhunch.vercel.app → .build/shots
bun render.ts                  # → out/hunch.mp4
bun render.ts --stills 20,53   # review frames → .build/stills
```

| File               | Job                                                                                                                                             |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `data.ts`          | Reads the live API: the demo hunch's compile and replay, tonight's board, the learning curve, memory lines, status, one proof; counts the tests |
| `shots.ts`         | Captures the live site for the montage                                                                                                          |
| `render.ts`        | Bundles `film/`, steps time frame by frame in Chromium, encodes, mixes the sound                                                                |
| `sfx.ts`           | Synthesised sound effects, plus `assets/audio/{pop,whoosh,ding}.wav`                                                                            |
| `film/main.ts`     | The timeline: 17 scenes on bars, and the cuts between them (flash, wipe, iris)                                                                  |
| `film/scenes-1.ts` | The hunch, the problem, the title, three prices, say it, the rule, the replay, the record, no hiding                                            |
| `film/scenes-2.ts` | Scoring, Walrus Memory, the cited call, learning, Proven, the live montage, under the hood, the end                                             |
| `film/kit.ts`      | Shots, giant type, slams, shakes, ASCII bars                                                                                                    |
| `film/lib.ts`      | Beat grid, easing, springs, seeded randomness, DOM helpers, the sound cue sheet                                                                 |
| `film/index.html`  | The 1920×1080 stage and every style                                                                                                             |

- **Deterministic:** every frame is `render(t)`. Nothing reads the clock or `Math.random`.
- **Honest:** every number comes from `.build/data.json`.
  - The replay is labelled "practice, not record".
  - The proof on screen is a pick made with a test delegation. It verifies like any other pick, and
    scoring leaves it out.
- **The look is the site's:** Inter and Geist Mono, paper and ink, and charts drawn in ASCII.
