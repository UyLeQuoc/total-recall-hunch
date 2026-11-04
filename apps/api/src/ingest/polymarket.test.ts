import { describe, expect, it } from "vitest";
import { homeOutcomeIndex } from "./polymarket.ts";

describe("homeOutcomeIndex", () => {
  it("finds the home team by name, in any order and case", () => {
    expect(homeOutcomeIndex(["Pistons", "76ers"], "Pistons")).toBe(0);
    expect(homeOutcomeIndex(["76ers", "Pistons"], "pistons")).toBe(1);
  });

  it("matches a short name against a full one, both ways", () => {
    expect(homeOutcomeIndex(["Lakers", "Trail Blazers"], "Blazers")).toBe(1);
    expect(homeOutcomeIndex(["Lakers", "Blazers"], "Trail Blazers")).toBe(1);
  });

  it("doesn't mistake one team for another that ends the same", () => {
    expect(homeOutcomeIndex(["Hornets", "Bulls"], "Nets")).toBeUndefined();
  });

  it("refuses to guess when no outcome or both match", () => {
    expect(homeOutcomeIndex(["Yes", "No"], "Pistons")).toBeUndefined();
    expect(homeOutcomeIndex(["Pistons", "Detroit Pistons"], "Pistons")).toBeUndefined();
  });
});
