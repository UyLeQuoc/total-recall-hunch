import { describe, expect, it } from "vitest";
import { compileByPattern, practiceMomentumRule } from "../compiler/patterns.ts";
import type { SportsRule } from "../compiler/rule.ts";
import type { Candle } from "../ingest/coinbase.ts";
import type { Snapshot } from "./evaluate.ts";
import { type PastGame, replayBtc, replaySports } from "./replay.ts";

const now = new Date("2026-11-02T15:00:00Z");

function splitRule(): SportsRule {
  const out = compileByPattern(
    "When the books and Polymarket disagree by 5+ points on an NBA game, the books are right.",
    now,
  );
  if (out?.kind !== "rule") throw new Error("expected a rule");
  return out.rule as SportsRule;
}

function game(
  id: string,
  startsAt: string,
  winner: "home" | "away",
  books: number,
  poly: number,
): PastGame {
  const lock = new Date(startsAt);
  const snaps: Snapshot[] = [
    { source: "books", homeProb: books, at: lock, kind: "close" },
    {
      source: "polymarket",
      homeProb: poly,
      at: new Date(lock.getTime() - 32 * 60_000),
      kind: "history",
    },
  ];
  return {
    id,
    title: "OKC @ CLE",
    home: "CLE",
    away: "OKC",
    startsAt: lock,
    winner,
    snapshots: snaps,
  };
}

describe("replaySports", () => {
  it("counts fires, hits and Brier by hand on three games", () => {
    const games = [
      game("a", "2026-10-30T23:00:00Z", "home", 0.7, 0.6),
      game("b", "2026-10-31T23:00:00Z", "away", 0.65, 0.58),
      game("c", "2026-11-01T23:00:00Z", "home", 0.6, 0.58),
    ];
    const r = replaySports(splitRule(), games, now);
    expect(r.considered).toBe(3);
    expect(r.fires).toBe(2);
    expect(r.right).toBe(1);
    expect(r.closingLines).toBe(2);
    expect(r.brier).toBeCloseTo(((0.7 - 1) ** 2 + (0.65 - 0) ** 2) / 2);
    expect(r.against.brier).toBeCloseTo(((0.6 - 1) ** 2 + (0.58 - 0) ** 2) / 2);
    expect(r.days.reduce((n, d) => n + d.fires, 0)).toBe(2);
  });

  it("skips and counts a game with no stored price for a source it reads", () => {
    const bare: PastGame = {
      ...game("d", "2026-11-01T23:00:00Z", "home", 0.7, 0.6),
      snapshots: [],
    };
    const r = replaySports(splitRule(), [bare], now);
    expect(r.skipped).toBe(1);
    expect(r.fires).toBe(0);
  });
});

describe("replayBtc", () => {
  it("scores each 5-minute window against the next one", () => {
    const start = new Date("2026-11-01T00:00:00Z").getTime();
    const candles: Candle[] = [100, 101, 102, 101].map((open, i) => ({
      startAt: new Date(start + i * 300_000),
      open,
      high: open + 2,
      low: open - 2,
      close: [101, 102, 101, 100][i] ?? open,
    }));
    const r = replayBtc(practiceMomentumRule(now), candles, now);
    expect(r.fires).toBe(3);
    expect(r.right).toBe(2);
    expect(r.against.brier).toBe(0.25);
  });
});
