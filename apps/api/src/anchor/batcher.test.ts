import { describe, expect, it } from "vitest";
import { batchDue } from "./batcher.ts";

const now = new Date("2026-11-03T00:00:00Z");
const ago = (min: number) => new Date(now.getTime() - min * 60_000);
const ahead = (min: number) => new Date(now.getTime() + min * 60_000);

describe("batchDue", () => {
  it("waits while the batch is young and every lock is far", () => {
    expect(batchDue([{ at: ago(3), lock: ahead(120) }], now)).toBe(false);
  });

  it("goes every 10 minutes", () => {
    expect(batchDue([{ at: ago(10), lock: ahead(120) }], now)).toBe(true);
  });

  it("goes early when a pick's game locks within 15 minutes", () => {
    expect(batchDue([{ at: ago(1), lock: ahead(14) }], now)).toBe(true);
  });

  it("has nothing to do without picks", () => {
    expect(batchDue([], now)).toBe(false);
  });
});
