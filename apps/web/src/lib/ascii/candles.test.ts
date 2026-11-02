import { describe, expect, it } from "vitest";
import { candles } from "./candles.ts";

describe("candles", () => {
  it("marks the entry and the current price on the axis", () => {
    const out = candles(
      [
        { open: 100, high: 104, low: 99, close: 103, label: "15:00" },
        { open: 103, high: 104, low: 98, close: 99, label: "15:01" },
      ],
      { rows: 10, entry: 101, price: 99, format: (v) => v.toFixed(0) },
    );
    expect(out).toContain("├ 101 entry");
    expect(out).toContain("99 now");
    expect(out).toContain("███");
    expect(out.split("\n")).toHaveLength(12);
  });
});
