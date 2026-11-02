import { describe, expect, it } from "vitest";
import { compileByPattern } from "./patterns.ts";
import { rule } from "./rule.ts";

const today = new Date("2026-11-02T12:00:00Z");

describe("compileByPattern", () => {
  it("compiles the books-vs-Polymarket example into a valid split rule", () => {
    const out = compileByPattern(
      "When the books and Polymarket disagree by 5+ points on an NBA game, the books are right.",
      today,
    );
    expect(out?.kind).toBe("rule");
    if (out?.kind !== "rule") return;
    expect(rule.safeParse(out.rule).success).toBe(true);
    expect(out.rule.name).toBe("The books beat Polymarket on NBA splits");
    expect(out.rule.against).toBe("polymarket");
    expect(out.rule.when.all).toContainEqual({
      kind: "gap",
      a: "books",
      b: "polymarket",
      min_pts: 5,
    });
    expect(out.rule.when.all).toContainEqual({ kind: "before_lock", minutes: 30 });
    expect(out.rule.limits.until).toBe("2026-11-30");
  });

  it("finds the trusted source when it's named second", () => {
    const out = compileByPattern(
      "On NBA games, Kalshi is sharper than Polymarket when they split by 4+ points.",
      today,
    );
    expect(out?.kind).toBe("rule");
    if (out?.kind !== "rule") return;
    expect(out.rule.name).toBe("Kalshi beats Polymarket on NBA splits");
    expect(out.rule.against).toBe("polymarket");
  });

  it("compiles the BTC example", () => {
    const out = compileByPattern(
      "When BTC rises more than 0.3% in 5 minutes, it keeps rising for the next 5.",
      today,
    );
    expect(out?.kind).toBe("rule");
    if (out?.kind !== "rule") return;
    expect(rule.safeParse(out.rule).success).toBe(true);
    expect(out.rule.when.all).toEqual([
      { kind: "move", source: "btc", window_min: 5, min_pct: 0.3 },
    ]);
    expect(out.rule.then[0].side).toEqual({ direction: "up" });
  });

  it("reads a reversal as the opposite pick", () => {
    const out = compileByPattern("If bitcoin drops 0.5% in 5 minutes, it bounces back.", today);
    if (out?.kind !== "rule") throw new Error("expected a rule");
    expect(out.rule.when.all[0]).toMatchObject({ min_pct: -0.5 });
    expect(out.rule.then[0].side).toEqual({ direction: "up" });
  });

  it("asks one question when it can't tell which source is right", () => {
    const out = compileByPattern("NBA: the books and Kalshi split by 6 points.", today);
    expect(out?.kind).toBe("question");
  });

  it("compiles the Senate example against Polymarket", () => {
    const out = compileByPattern(
      "On Senate races, Kalshi is sharper than Polymarket when they split by 2+ points.",
      today,
    );
    if (out?.kind !== "rule") throw new Error("expected a rule");
    expect(rule.safeParse(out.rule).success).toBe(true);
    expect(out.rule.scope.league).toEqual(["SENATE"]);
    expect(out.rule.name).toBe("Kalshi beats Polymarket on Senate splits");
  });

  it("refuses the books on Senate races, and the House for now", () => {
    expect(
      compileByPattern("On Senate races, the books beat Kalshi by 3+ points.", today)?.kind,
    ).toBe("refused");
    expect(
      compileByPattern("On House races, Kalshi is sharper than Polymarket by 5+ points.", today)
        ?.kind,
    ).toBe("refused");
  });

  it("returns nothing for text it has no shape for", () => {
    expect(compileByPattern("The Lakers always choke in November.", today)).toBeUndefined();
  });
});
