# ADR-0009: The look: one prompt column, and data drawn in ASCII

- **Status:** Accepted
- **Date:** 2026-11-02
- **Deciders:** Uy (asked for the style of
  [visual-agent-chat](https://visual-agent-chat.shridharathinarayanan.workers.dev) and of
  [ascii.rest's data pieces](https://ascii.rest/#data))

## Context

- **The PRD asks for one story:** say it, see it tested (§4, §6.1). A chat-like column fits it.
- **The owner pointed at two references:**
  - visual-agent-chat: one centred column, a borderless prompt line, starter pills, a "thinking" state
    with a few steps beside an animated tile, then a plain answer with tables;
  - ascii.rest's "data" pieces: bar charts, candlesticks, sparklines, uptime bars and a radar drawn with
    box-drawing and block characters in a monospace font.

## Decision

- **Layout and flow follow the chat page:** a 720px column, "What's your hunch?" as the prompt line, the
  three examples as pills, a "Testing" state whose steps are the server's real steps, then the rule card,
  the replay and the actions. "See one scored now" adds a turn below.
- **Every chart is ASCII, in the spirit of ascii.rest:** the replay's fires per day, the Brier bars, the
  live BTC candles with the entry line, the price sparklines, the sources' uptime per hour, and a radar
  sweep while a hunch is tested. **Hunch draws them itself,** from its own data, with pure renderers in
  `apps/web/src/lib/ascii/`. Nothing is copied from either site.
- **Type:** Inter for prose; Geist Mono for the rule card, the numbers and the ASCII (Google Fonts).
- **Colour:** the chat page's palette, light and dark by system preference, set as shadcn's CSS variables.
  The primitives keep their own sizes.
- **An ASCII piece scales its font to fit its column** (`--cols`), so it never scrolls sideways on a phone.

## Consequences

- **The page reads as one conversation** and stays small: no chart library.
- **The renderers are tested like any pure function** (`*.test.ts` next to each).

## Links

[ADR-0008](0008-first-runnable-slice.md) · [PRD §6](../prd.md) · [code rules](../code-rules.md)
