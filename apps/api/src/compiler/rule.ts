import { z } from "zod";

export const marketSource = z.enum(["books", "polymarket", "kalshi"]);
export type MarketSource = z.infer<typeof marketSource>;

const beforeLock = z.object({
  kind: z.literal("before_lock"),
  minutes: z
    .number()
    .int()
    .min(1)
    .max(24 * 60),
});
const gap = z.object({
  kind: z.literal("gap"),
  a: marketSource,
  b: marketSource,
  min_pts: z.number().min(0.5).max(50),
});
const price = z.object({
  kind: z.literal("price"),
  source: marketSource,
  side: z.enum(["favourite", "underdog", "home", "away"]),
  op: z.enum(["gte", "lte"]),
  value: z.number().min(0.01).max(0.99),
});
const move = z.object({
  kind: z.literal("move"),
  source: z.literal("btc"),
  window_min: z.literal(5),
  min_pct: z.number().min(-10).max(10),
});

export const condition = z.discriminatedUnion("kind", [beforeLock, gap, price, move]);
export type Condition = z.infer<typeof condition>;

const sportsSide = z.union([
  z.object({ favourite_of: marketSource }),
  z.object({ underdog_of: marketSource }),
  z.object({ team: z.enum(["home", "away"]) }),
]);

const confidence = z.union([
  z.object({ price_of: marketSource }),
  z.object({ fixed: z.number().min(0.01).max(0.99) }),
]);

const limits = z.object({
  picks_per_day: z.number().int().min(1).max(50),
  until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const sportsRule = z.object({
  name: z.string().min(3).max(80),
  version: z.number().int().min(1),
  scope: z.object({ league: z.tuple([z.literal("NBA")]), market: z.literal("moneyline") }),
  when: z.object({ all: z.array(condition).min(1).max(6) }),
  then: z.tuple([z.object({ kind: z.literal("pick"), side: sportsSide, confidence })]),
  against: marketSource,
  limits,
  stage: z.enum(["practice", "on_record"]),
});

const btcRule = z.object({
  name: z.string().min(3).max(80),
  version: z.number().int().min(1),
  scope: z.object({ league: z.tuple([z.literal("BTC")]), market: z.literal("updown_5m") }),
  when: z.object({ all: z.array(move).min(1).max(2) }),
  then: z.tuple([
    z.object({
      kind: z.literal("pick"),
      side: z.object({ direction: z.enum(["up", "down", "same_as_move"]) }),
      confidence: z.object({ fixed: z.number().min(0.01).max(0.99) }),
    }),
  ]),
  against: z.literal("predict"),
  limits,
  stage: z.enum(["practice", "on_record"]),
});

export const rule = z.union([sportsRule, btcRule]);
export type Rule = z.infer<typeof rule>;
export type SportsRule = z.infer<typeof sportsRule>;
export type BtcRule = z.infer<typeof btcRule>;

export function isBtcRule(r: Rule): r is BtcRule {
  return r.scope.league[0] === "BTC";
}
