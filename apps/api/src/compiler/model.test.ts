import { describe, expect, it } from "vitest";
import { readReply } from "./model.ts";

describe("readReply", () => {
  it("reads one JSON object out of the model's text", () => {
    const out = readReply('Here: {"question": "Which source sets the favourite?"} done');
    expect(out?.success).toBe(true);
  });

  it("reports schema problems so the model can fix them", () => {
    const out = readReply(
      JSON.stringify({
        rule: {
          name: "Kalshi beats Polymarket",
          version: 1,
          scope: { league: ["NBA"], market: "moneyline" },
          when: { all: [{ kind: "gap", a: "kalshi", b: "polymarket", min_pts: 0.03 }] },
          then: [
            { kind: "pick", side: { favourite_of: "kalshi" }, confidence: { price_of: "kalshi" } },
          ],
          against: "polymarket",
          limits: { picks_per_day: 10, until: "2026-11-30" },
          stage: "practice",
        },
      }),
    );
    expect(out?.success).toBe(false);
  });

  it("gives up on text with no JSON in it", () => {
    expect(readReply("I can't do that.")).toBeUndefined();
  });

  it("shortens a long title instead of dropping the rule", () => {
    const out = readReply(
      JSON.stringify({
        rule: {
          name: "x".repeat(120),
          version: 1,
          scope: { league: ["BTC"], market: "updown_5m" },
          when: { all: [{ kind: "move", source: "btc", window_min: 5, min_pct: 0.3 }] },
          then: [{ kind: "pick", side: { direction: "up" }, confidence: { fixed: 0.6 } }],
          against: "predict",
          limits: { picks_per_day: 10, until: "2026-11-30" },
          stage: "practice",
        },
      }),
    );
    expect(out?.success).toBe(true);
    if (out?.success && "rule" in out.data)
      expect(out.data.rule.name.length).toBeLessThanOrEqual(80);
  });
});
