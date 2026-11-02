import { describe, expect, it } from "vitest";
import { homeProbWithoutVig, impliedFromAmerican, normalisedPair, parseAmerican } from "./odds.ts";

describe("odds", () => {
  it("turns American odds into implied probability", () => {
    expect(impliedFromAmerican(-200)).toBeCloseTo(2 / 3);
    expect(impliedFromAmerican(150)).toBeCloseTo(0.4);
  });

  it("removes the vig so both sides sum to 1", () => {
    const home = homeProbWithoutVig(-179, 150);
    expect(home).toBeDefined();
    expect(home ?? 0).toBeGreaterThan(0.6);
    expect(home ?? 0).toBeLessThan(0.63);
  });

  it("reads ESPN's odds text", () => {
    expect(parseAmerican("+230")).toBe(230);
    expect(parseAmerican("-285")).toBe(-285);
    expect(parseAmerican("EVEN")).toBe(100);
    expect(parseAmerican("OFF")).toBeUndefined();
  });

  it("normalises a two-sided market", () => {
    expect(normalisedPair(0.61, 0.4)).toBeCloseTo(0.604, 3);
    expect(normalisedPair(0, 0)).toBeUndefined();
  });
});
