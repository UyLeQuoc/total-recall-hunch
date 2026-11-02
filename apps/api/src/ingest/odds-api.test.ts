import { describe, expect, it } from "vitest";
import { consensus, matchGame, oddsCallDue, parseOddsEvents } from "./odds-api.ts";

const sample = [
  {
    id: "e1",
    sport_key: "basketball_nba",
    commence_time: "2026-11-03T00:10:00Z",
    home_team: "Los Angeles Clippers",
    away_team: "Toronto Raptors",
    bookmakers: [
      {
        key: "pinnacle",
        title: "Pinnacle",
        last_update: "2026-11-02T22:00:00Z",
        markets: [
          {
            key: "h2h",
            outcomes: [
              { name: "Los Angeles Clippers", price: -200 },
              { name: "Toronto Raptors", price: 175 },
            ],
          },
        ],
      },
      {
        key: "fanduel",
        title: "FanDuel",
        last_update: "2026-11-02T22:01:00Z",
        markets: [{ key: "spreads", outcomes: [] }],
      },
    ],
  },
];

describe("The Odds API", () => {
  it("turns each book's moneyline into the home team's chance, vig removed", () => {
    const [event] = parseOddsEvents(sample);
    expect(event?.books).toHaveLength(1);
    expect(event?.books[0]?.book).toBe("pinnacle");
    expect(event?.books[0]?.homeProb ?? 0).toBeGreaterThan(0.64);
    expect(event?.books[0]?.homeProb ?? 1).toBeLessThan(0.66);
  });

  it("matches ESPN's short names to the full ones, near the same tip-off", () => {
    const events = parseOddsEvents(sample);
    const startsAt = new Date("2026-11-03T03:00:00Z");
    expect(
      matchGame(events, { homeNickname: "Clippers", awayNickname: "Raptors", startsAt }),
    ).toBeDefined();
    expect(
      matchGame(events, {
        homeNickname: "Clippers",
        awayNickname: "Raptors",
        startsAt: new Date("2026-11-05T03:00:00Z"),
      }),
    ).toBeUndefined();
  });

  it("averages the books into one consensus", () => {
    expect(consensus([0.6, 0.62, 0.64])).toBeCloseTo(0.62);
    expect(consensus([])).toBeUndefined();
  });

  it("spends a call only near a lock, every 30 minutes, under the daily cap", () => {
    const now = new Date("2026-11-02T22:00:00Z");
    const lock = [new Date("2026-11-03T00:00:00Z")];
    expect(oddsCallDue(now, lock, undefined, 0, 12)).toBe(true);
    expect(oddsCallDue(now, lock, new Date("2026-11-02T21:45:00Z"), 0, 12)).toBe(false);
    expect(oddsCallDue(now, lock, undefined, 12, 12)).toBe(false);
    expect(oddsCallDue(now, [new Date("2026-11-03T06:00:00Z")], undefined, 0, 12)).toBe(false);
  });
});
