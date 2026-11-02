import { describe, expect, it } from "vitest";
import { lineChart } from "./lines.ts";

describe("lineChart", () => {
  const out = lineChart(
    [
      { label: "plain", mark: "○", values: [0.2, 0.21, 0.22] },
      { label: "call", mark: "●", values: [0.2, 0.19, 0.18] },
    ],
    20,
    6,
    (v) => v.toFixed(2),
  );
  const lines = out.split("\n");

  it("labels the top and bottom of the axis with the range", () => {
    expect(lines[0]).toMatch(/^0\.22 ┤/);
    expect(lines[5]).toMatch(/^0\.18 ┤/);
  });

  it("puts the highest point on the top row and the lowest on the bottom", () => {
    expect(lines[0]).toContain("○");
    expect(lines[5]).toContain("●");
  });

  it("ends with a legend", () => {
    expect(lines.at(-1)).toContain("● call");
  });
});
