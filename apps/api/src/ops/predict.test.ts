import { describe, expect, it } from "vitest";
import {
  LAST_ORDER_MS,
  liveWindows,
  type MarketWindow,
  parseArgs,
  settledSide,
  untilExpiry,
  windowForOrder,
  withinLimits,
} from "./predict.ts";

const now = 1_793_640_000_000;
const market = (id: string, inMs: number, extra: Partial<MarketWindow> = {}): MarketWindow => ({
  id,
  expiryMs: BigInt(now + inMs),
  mintPaused: false,
  referencePrice: 77_800,
  ...extra,
});

describe("parseArgs", () => {
  it("is a dry run by default, buying UP for 1 USDC", () => {
    expect(parseArgs([])).toEqual({
      ok: true,
      args: { order: false, side: "up", amount: 1, network: "testnet" },
    });
  });

  it("reads --order, --side and --amount", () => {
    const out = parseArgs(["--order", "--side", "down", "--amount", "2"]);
    expect(out.ok && out.args).toEqual({
      order: true,
      side: "down",
      amount: 2,
      network: "testnet",
    });
  });

  it("refuses any network but testnet", () => {
    expect(parseArgs(["--network", "mainnet"]).ok).toBe(false);
  });

  it("refuses a premium under Predict's minimum", () => {
    expect(parseArgs(["--amount", "0.5"]).ok).toBe(false);
  });

  it("refuses an unknown argument", () => {
    expect(parseArgs(["--yolo"]).ok).toBe(false);
  });
});

describe("markets", () => {
  const markets = [
    market("late", 30_000),
    market("paused", 200_000, { mintPaused: true }),
    market("unseeded", 150_000, { referencePrice: null }),
    market("next", 240_000),
    market("expired", -10_000),
  ];

  it("lists open windows soonest first", () => {
    expect(liveWindows(markets, now).map((m) => m.id)).toEqual(["late", "next"]);
  });

  it("orders only where the window has time left", () => {
    expect(windowForOrder(markets, now)?.id).toBe("next");
    expect(windowForOrder([market("late", LAST_ORDER_MS - 1)], now)).toBeUndefined();
  });

  it("formats the time to expiry", () => {
    expect(untilExpiry(BigInt(now + 125_000), now)).toBe("2m 05s");
  });
});

describe("limits", () => {
  it("keeps the price between 0.15 and 0.85", () => {
    expect(withinLimits(0.5)).toBe(true);
    expect(withinLimits(0.1)).toBe(false);
    expect(withinLimits(0.9)).toBe(false);
  });

  it("reads which side a settlement paid", () => {
    expect(settledSide(77_900, 77_800)).toBe("up");
    expect(settledSide(77_800, 77_800)).toBe("down");
  });
});
