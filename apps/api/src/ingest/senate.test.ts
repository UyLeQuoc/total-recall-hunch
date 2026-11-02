import { describe, expect, it } from "vitest";
import type { KalshiMarket } from "./kalshi.ts";
import { parseRace } from "./polymarket.ts";
import { FIRST_POLLS_CLOSE, raceStatus, raceWinner } from "./senate.ts";
import { candidateLabel } from "./states.ts";

const market = (result: "yes" | "no" | undefined): KalshiMarket => ({
  ticker: "T",
  name: "N",
  mid: 0.5,
  result,
});

describe("senate", () => {
  it("reads the Democrat and the Republican from Polymarket's race market", () => {
    const race = parseRace([
      {
        markets: [
          {
            groupItemTitle: "James Talarico (D)",
            outcomePrices: ["0.755", "0.245"],
            closed: false,
          },
          { groupItemTitle: "Ken Paxton (R)", outcomePrices: ["0.245", "0.755"], closed: false },
          { groupItemTitle: "Person A", closed: false },
        ],
      },
    ]);
    expect(race).toEqual({
      dName: "James Talarico",
      rName: "Ken Paxton",
      dYes: 0.755,
      rYes: 0.245,
      closed: false,
    });
  });

  it("resolves from either market's own result, Kalshi first", () => {
    expect(raceWinner(market("yes"), market("no"), undefined)).toBe("home");
    expect(raceWinner(market(undefined), market("yes"), undefined)).toBe("away");
    expect(
      raceWinner(undefined, undefined, {
        dName: "",
        rName: "",
        dYes: 0.001,
        rYes: 0.999,
        closed: true,
      }),
    ).toBe("away");
    expect(
      raceWinner(undefined, undefined, {
        dName: "",
        rName: "",
        dYes: 0.6,
        rYes: 0.4,
        closed: false,
      }),
    ).toBeNull();
  });

  it("locks every race when the first polls close", () => {
    expect(raceStatus(new Date(FIRST_POLLS_CLOSE.getTime() - 1000), null)).toBe("pre");
    expect(raceStatus(FIRST_POLLS_CLOSE, null)).toBe("in");
    expect(raceStatus(FIRST_POLLS_CLOSE, "home")).toBe("post");
  });

  it("labels a party-only market by the party, a candidate by surname", () => {
    expect(candidateLabel("Democratic party", "D")).toBe("Democrat");
    expect(candidateLabel("James Talarico", "D")).toBe("Talarico");
  });
});
