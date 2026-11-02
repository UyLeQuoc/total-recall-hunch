import { describe, expect, it } from "vitest";
import { uptimeRow } from "./uptime.ts";

describe("uptimeRow", () => {
  it("shows a gap as a dot and the busiest hour as a full block", () => {
    expect(uptimeRow([0, 2, 4])).toBe("·▄█");
  });
});
