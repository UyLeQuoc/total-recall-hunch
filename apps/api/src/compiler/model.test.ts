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
});
