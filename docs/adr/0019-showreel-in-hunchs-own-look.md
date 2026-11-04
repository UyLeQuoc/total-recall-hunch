# ADR-0019: The showreel in Hunch's own look, on a score synthesised in code

- **Status:** Accepted
- **Date:** 2026-11-04
- **Deciders:** Uy ("này style bên mira mà", then "dựa theo style hiện tại của hunch, make a dynamic
  120-second motion graphics video … go all out, showcase the project for tatum hackathon")
- **Supersedes:** [ADR-0018](0018-demo-film-from-code.md)'s look and music bed

## Context

- **ADR-0018's film reused Mira's motion language and music:** bouncing type, flashes, grain and the
  GarageBand bed. The owner asked for Hunch's own style.
- **Hunch's style is the site's** ([ADR-0009](0009-the-look.md)):
  - paper and ink;
  - Inter and Geist Mono;
  - one prompt column;
  - every chart drawn in ASCII.
- **The event asks for a 2–3 minute video.** The owner asked for 120 seconds.

## Decision

- **The motion language is ASCII,** drawn on a canvas character grid (`film/ascii.ts`):
  - a noise field;
  - the title and PROVEN as glyph masks;
  - Walrus Memory as a lit sphere with a lat/long grid and memory pins;
  - Sui as an orthographic cube;
  - an end tunnel.

  Cuts are block dissolves in the next scene's colour, plus a flash on each of the two drops. A HUD in the
  corners shows the act, the timecode and the bar.
- **Text decodes out of glyph noise or types in.** Nothing bounces. Colour is the site's: paper and ink,
  with green for hits and blobs, red for misses, and Sui blue for the anchor.
- **14 acts on 60 bars at 120 BPM:** exactly 120 s. The acts are:
  1. the hunch;
  2. wins stick;
  3. title;
  4. three prices;
  5. tonight's board;
  6. say it;
  7. replay;
  8. on record;
  9. no hiding;
  10. Walrus Memory and the scores;
  11. learning and the cited call;
  12. Proven;
  13. under the hood;
  14. end.
- **The score is synthesised in `score.ts`** (A minor, Am F C G), with sections that follow the picture:
  - intro, then build;
  - a groove from bar 12;
  - a break with FM bells over the memory act;
  - a drop from bar 42;
  - an outro.

  It has kick, clap, hats, a sidechained bass, a plucked arp with delay, detuned pads, a lead and reverb.
  The sound effects are synthesised in `sfx.ts`.
- **Nothing comes from Mira any more.** `apps/video/assets` is gone.
- **Unchanged from ADR-0018:**
  - every number is measured by `data.ts`;
  - the screens are real;
  - the replay is labelled practice;
  - the output isn't committed.

## Consequences

- **The film and the site share one look,** and the soundtrack is Hunch's own.
- **Re-cutting** means editing a scene file and re-rendering, which takes about 13 minutes with 8 workers.
- **120 s is the floor of the event's 2–3 minutes.** Add bars to `film/main.ts` and `score.ts` together to
  lengthen it.

## Links

[ADR-0018](0018-demo-film-from-code.md) · [ADR-0009](0009-the-look.md) · [apps/video/README.md](../../apps/video/README.md)
