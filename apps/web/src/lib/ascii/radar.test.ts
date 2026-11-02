import { describe, expect, it } from "vitest";
import { radarFrame } from "./radar.ts";

describe("radarFrame", () => {
  it("draws the crosshair at the centre and keeps its size", () => {
    const out = radarFrame(21, 11, 0, []);
    const lines = out.split("\n");
    expect(lines).toHaveLength(11);
    expect(lines[5]?.[10]).toBe("┼");
  });
});
