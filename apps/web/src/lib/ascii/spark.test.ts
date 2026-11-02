import { describe, expect, it } from "vitest";
import { sparkline } from "./spark.ts";

describe("sparkline", () => {
  it("keeps the width and shows a flat series as a flat line", () => {
    expect([...sparkline([0.5, 0.5, 0.5], 6)]).toHaveLength(6);
    expect(sparkline([0.5, 0.5], 2)).toBe("▄▄");
  });

  it("puts the highest value at the top of the ramp", () => {
    expect(sparkline([1, 2, 3], 3).at(-1)).toBe("█");
  });
});
