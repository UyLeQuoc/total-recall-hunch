import { describe, expect, it } from "vitest";
import { PROVEN_N, type ResolvedPick, scoreVersion } from "./record.ts";

function picks(
  n: number,
  ruleConf: number,
  marketHome: number,
  rightEvery: number,
): ResolvedPick[] {
  return Array.from({ length: n }, (_, i) => ({
    side: "home",
    confidence: ruleConf,
    outcome: i % rightEvery === 0 ? 0 : 1,
    seen: { polymarket: { p: marketHome } },
  }));
}

describe("scoreVersion", () => {
  it("earns Proven only at n ≥ 20 with a better Brier than its market", () => {
    const record = scoreVersion(picks(PROVEN_N, 0.7, 0.6, 4), "polymarket");
    expect(record.n).toBe(20);
    expect(record.right).toBe(15);
    expect(record.brier ?? 1).toBeLessThan(record.against.brier ?? 0);
    expect(record.proven).toBe(true);
  });

  it("isn't Proven under 20 picks, however good", () => {
    expect(scoreVersion(picks(19, 0.7, 0.6, 4), "polymarket").proven).toBe(false);
  });

  it("isn't Proven when the market did better on the same games", () => {
    expect(scoreVersion(picks(30, 0.9, 0.6, 2), "polymarket").proven).toBe(false);
  });

  it("compares only the picks where the market's price was seen", () => {
    const mixed = [
      ...picks(3, 0.7, 0.6, 4),
      { side: "away", confidence: 0.6, outcome: 1, seen: {} },
    ];
    expect(scoreVersion(mixed, "polymarket").against.compared).toBe(3);
  });
});
