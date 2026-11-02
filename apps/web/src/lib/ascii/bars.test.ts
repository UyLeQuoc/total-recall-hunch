import { describe, expect, it } from "vitest";
import { dayBars } from "./bars.ts";

describe("dayBars", () => {
  const days = [
    { label: "mon", fires: 2, right: 1 },
    { label: "tue", fires: 6, right: 4 },
  ];

  it("labels each bar right/fired and each day", () => {
    const out = dayBars(days);
    expect(out).toContain("4/6");
    expect(out).toContain("1/2");
    expect(out).toContain("mon");
    expect(out).toMatch(/0 └─+/);
  });

  it("draws nothing above the axis at progress 0", () => {
    const out = dayBars(days, 8, 0);
    expect(out).not.toContain("█");
    expect(out).not.toContain("░");
  });

  it("puts the middle tick at its value's height", () => {
    const lines = dayBars([{ label: "mon", fires: 3, right: 3 }], 6).split("\n");
    const row = lines.findIndex((l) => l.startsWith("2 ┤"));
    expect(lines.length - 3 - row).toBe(3);
  });
});
