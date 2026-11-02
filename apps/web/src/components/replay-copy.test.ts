import { describe, expect, it } from "vitest";
import type { Replay } from "@/lib/rule-schemas";
import { replayFootnotes, replayHeadline, replayVerdict } from "./replay-copy";

const base: Replay = {
  considered: 38,
  skipped: 2,
  fires: 9,
  right: 6,
  brier: 0.21,
  against: { name: "polymarket", brier: 0.24, compared: 9 },
  closingLines: 9,
  days: [],
  recent: [],
};

describe("replay copy", () => {
  it("states fires, hits and both Briers in one line", () => {
    expect(replayHeadline(base, false)).toBe(
      "Last 7 days: 9 fires, 6 right. Brier 0.210, Polymarket's 0.240 on the same games.",
    );
  });

  it("says plainly when nothing fired", () => {
    expect(replayHeadline({ ...base, fires: 0, right: 0, brier: null }, false)).toBe(
      "Last 7 days: no fires across 38 games (2 had no stored prices).",
    );
  });

  it("calls a small sample early", () => {
    expect(replayVerdict(base)).toContain("Proven needs 20 on record");
  });

  it("lists the skips and the backfilled closing lines", () => {
    expect(replayFootnotes(base, false)).toHaveLength(2);
  });
});
