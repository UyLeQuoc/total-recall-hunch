import { describe, expect, it } from "vitest";
import type { Snapshot } from "../monitor/evaluate.ts";
import type { PastGame } from "../monitor/replay.ts";
import {
  agentCall,
  learningCurve,
  parseTrustLine,
  shrunkBrier,
  sourceObservations,
  trustLine,
  voiceStats,
} from "./voices.ts";

function game(i: number, winner: "home" | "away", books: number, poly: number): PastGame {
  const lock = new Date(Date.UTC(2026, 9, 20 + i, 23));
  const snaps: Snapshot[] = [
    { source: "books", homeProb: books, at: lock, kind: "close" },
    {
      source: "polymarket",
      homeProb: poly,
      at: new Date(lock.getTime() - 4 * 60_000),
      kind: "history",
    },
  ];
  return {
    id: `g${i}`,
    title: "OKC @ CLE",
    home: "CLE",
    away: "OKC",
    startsAt: lock,
    winner,
    snapshots: snaps,
  };
}

describe("voices", () => {
  const games = [game(0, "home", 0.7, 0.6), game(1, "away", 0.4, 0.5), game(2, "home", 0.8, 0.7)];

  it("scores each source on every game it priced at lock", () => {
    const stats = voiceStats(sourceObservations(games));
    const books = stats.find((s) => s.voice === "books");
    expect(books?.n).toBe(3);
    expect(books?.brier).toBeCloseTo((0.3 ** 2 + 0.4 ** 2 + 0.2 ** 2) / 3);
    expect(books?.hit).toBe(1);
  });

  it("shrinks a small sample toward a coin flip", () => {
    expect(shrunkBrier({ n: 1, brier: 0 })).toBeGreaterThan(0.2);
    expect(shrunkBrier({ n: 1000, brier: 0.1 })).toBeLessThan(0.11);
  });

  it("leans on the source with the better record and cites it", () => {
    const trust = new Map([
      ["books", { voice: "books", n: 40, brier: 0.18, memoryId: "m1", blobId: "b1" }],
      ["polymarket", { voice: "polymarket", n: 40, brier: 0.24, memoryId: "m2", blobId: null }],
    ]);
    const call = agentCall({ books: 0.7, polymarket: 0.6 }, trust);
    expect(call?.homeProb).toBeGreaterThan(0.65);
    expect(call?.plainProb).toBeCloseTo(0.65);
    expect(call?.lines[0]?.text).toContain("Leaning on the books");
    expect(call?.lines[0]?.cites?.memoryId).toBe("m1");
    expect(call?.lines[1]?.text).toContain("away from Polymarket");
  });

  it("weighs every source the same before any memory exists", () => {
    const call = agentCall({ books: 0.7, polymarket: 0.6 }, new Map());
    expect(call?.homeProb).toBeCloseTo(0.65);
    expect(call?.lines[0]?.cites).toBeNull();
  });

  it("draws the learning curve one game at a time, without peeking ahead", () => {
    const points = learningCurve(games);
    expect(points).toHaveLength(3);
    expect(points[0]?.call).toBeCloseTo((0.65 - 1) ** 2);
    expect(points.at(-1)?.n).toBe(3);
  });

  it("writes and reads a trust line", () => {
    const [stat] = voiceStats(sourceObservations(games));
    if (!stat) throw new Error("expected a stat");
    const parsed = parseTrustLine(trustLine(stat, "2026-11-03"));
    expect(parsed?.voice).toBe(stat.voice);
    expect(parsed?.n).toBe(stat.n);
    expect(parsed?.asOf).toBe("2026-11-03");
  });
});
