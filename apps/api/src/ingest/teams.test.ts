import { describe, expect, it } from "vitest";
import { easternDate, kalshiEventTicker, polymarketSlug, standardAbbr } from "./teams.ts";

describe("teams", () => {
  it("maps ESPN's short abbreviations to the markets' ones", () => {
    expect(standardAbbr("GS")).toBe("GSW");
    expect(standardAbbr("UTAH")).toBe("UTA");
    expect(standardAbbr("OKC")).toBe("OKC");
  });

  it("dates a game by its US Eastern day, as the markets do", () => {
    expect(easternDate(new Date("2026-11-03T00:00:00Z"))).toBe("2026-11-02");
  });

  it("builds the Polymarket slug and the Kalshi ticker, away team first", () => {
    const game = { away: "OKC", home: "CLE", startsAt: new Date("2026-11-03T00:00:00Z") };
    expect(polymarketSlug(game)).toBe("nba-okc-cle-2026-11-02");
    expect(kalshiEventTicker(game)).toBe("KXNBAGAME-26NOV02OKCCLE");
  });
});
