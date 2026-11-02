import { describe, expect, it } from "vitest";
import { compileByPattern, practiceMomentumRule } from "../compiler/patterns.ts";
import type { SportsRule } from "../compiler/rule.ts";
import { evaluateBtc, evaluateSports, freshPrice, type Snapshot } from "./evaluate.ts";

const today = new Date("2026-11-02T12:00:00Z");
const lock = new Date("2026-11-03T00:00:00Z");
const at = (minBeforeLock: number) => new Date(lock.getTime() - minBeforeLock * 60_000);

function splitRule(): SportsRule {
  const out = compileByPattern(
    "When the books and Polymarket disagree by 5+ points on an NBA game, the books are right.",
    today,
  );
  if (out?.kind !== "rule" || !("league" in out.rule.scope) || out.rule.scope.league[0] !== "NBA") {
    throw new Error("expected the sports rule");
  }
  return out.rule as SportsRule;
}

const snap = (source: Snapshot["source"], homeProb: number, minBefore: number): Snapshot => ({
  source,
  homeProb,
  at: at(minBefore),
  kind: "live",
});

describe("evaluateSports", () => {
  it("fires on a 6-point split 30 minutes before tip-off and picks the books' favourite", () => {
    const v = evaluateSports(splitRule(), at(30), lock, [
      snap("books", 0.64, 32),
      snap("polymarket", 0.58, 31),
    ]);
    expect(v.fired).toBe(true);
    if (!v.fired) return;
    expect(v.pick.side).toBe("home");
    expect(v.pick.confidence).toBeCloseTo(0.64);
  });

  it("doesn't fire on a 3-point split", () => {
    const v = evaluateSports(splitRule(), at(30), lock, [
      snap("books", 0.61, 32),
      snap("polymarket", 0.58, 31),
    ]);
    expect(v.fired).toBe(false);
  });

  it("treats a stale price as missing, never as a match", () => {
    const v = evaluateSports(splitRule(), at(30), lock, [
      snap("books", 0.7, 45),
      snap("polymarket", 0.5, 31),
    ]);
    expect(v.fired).toBe(false);
    expect(v.why.join(" ")).toContain("no fresh books price");
  });

  it("doesn't fire outside its window before lock", () => {
    const v = evaluateSports(splitRule(), at(90), lock, [
      snap("books", 0.7, 91),
      snap("polymarket", 0.5, 91),
    ]);
    expect(v.fired).toBe(false);
  });

  it("uses a closing line only when the replay allows it", () => {
    const close: Snapshot = { source: "books", homeProb: 0.7, at: lock, kind: "close" };
    expect(freshPrice([close], "books", at(30), lock, false)).toBeUndefined();
    expect(freshPrice([close], "books", at(30), lock, true)?.closing).toBe(true);
  });
});

describe("evaluateBtc", () => {
  it("follows the move for the practice rule", () => {
    const v = evaluateBtc(practiceMomentumRule(today), -0.12);
    expect(v.fired && v.pick.direction).toBe("down");
  });

  it("needs the move to reach the threshold", () => {
    const out = compileByPattern(
      "When BTC rises more than 0.3% in 5 minutes, it keeps rising.",
      today,
    );
    if (out?.kind !== "rule" || out.rule.scope.league[0] !== "BTC") throw new Error("expected BTC");
    const btc = out.rule as Parameters<typeof evaluateBtc>[0];
    expect(evaluateBtc(btc, 0.2).fired).toBe(false);
    expect(evaluateBtc(btc, 0.31).fired).toBe(true);
  });
});
