import { describe, expect, it } from "vitest";
import { meter } from "./meter.ts";

describe("meter", () => {
  it("prints one aligned row per value, n/a when missing", () => {
    const out = meter([
      { label: "rule", value: 0.21 },
      { label: "polymarket", value: null },
    ]).split("\n");
    expect(out).toHaveLength(2);
    expect(out[0]).toContain("0.210");
    expect(out[1]).toContain("n/a");
  });
});
