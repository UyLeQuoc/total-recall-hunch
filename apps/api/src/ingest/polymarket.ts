import { z } from "zod";
import { getJson } from "./http.ts";

const jsonList = z
  .string()
  .transform((s) => JSON.parse(s) as unknown)
  .pipe(z.array(z.union([z.string(), z.number()]).transform(String)));

const eventsSchema = z.array(
  z.object({
    markets: z.array(
      z.object({
        sportsMarketType: z.string().nullish(),
        outcomes: jsonList,
        outcomePrices: jsonList.optional(),
        clobTokenIds: jsonList.optional(),
      }),
    ),
  }),
);

const historySchema = z.object({ history: z.array(z.object({ t: z.number(), p: z.number() })) });

export interface PolymarketGame {
  homeProb: number;
  homeToken: string | undefined;
}

export function homeOutcomeIndex(outcomes: string[], homeName: string): number | undefined {
  const home = homeName.toLowerCase();
  const named = outcomes.flatMap((outcome, index) => {
    const o = outcome.toLowerCase();
    return o === home || o.endsWith(` ${home}`) || home.endsWith(` ${o}`) ? [index] : [];
  });
  return named.length === 1 ? named[0] : undefined;
}

export async function fetchGame(
  slug: string,
  homeName: string,
): Promise<PolymarketGame | undefined> {
  const events = await getJson(
    `https://gamma-api.polymarket.com/events?slug=${encodeURIComponent(slug)}`,
    eventsSchema,
  );
  const market = events[0]?.markets.find((m) => m.sportsMarketType === "moneyline");
  if (!market) return undefined;
  const homeIndex = homeOutcomeIndex(market.outcomes, homeName);
  if (homeIndex === undefined) return undefined;
  const price = Number(market.outcomePrices?.[homeIndex]);
  if (!Number.isFinite(price)) return undefined;
  return {
    homeProb: price,
    homeToken: market.clobTokenIds?.[homeIndex],
  };
}

export async function fetchHistory(
  token: string,
  from: Date,
  to: Date,
): Promise<{ at: Date; p: number }[]> {
  const startTs = Math.floor(from.getTime() / 1000);
  const endTs = Math.floor(to.getTime() / 1000);
  const data = await getJson(
    `https://clob.polymarket.com/prices-history?market=${token}&startTs=${startTs}&endTs=${endTs}&fidelity=5`,
    historySchema,
  );
  return data.history.map((h) => ({ at: new Date(h.t * 1000), p: h.p }));
}

const raceSchema = z.array(
  z.object({
    markets: z.array(
      z.object({
        groupItemTitle: z.string().nullish(),
        outcomePrices: jsonList.optional(),
        closed: z.boolean().optional(),
      }),
    ),
  }),
);

export interface RaceMarket {
  dName: string;
  rName: string;
  dYes: number;
  rYes: number;
  closed: boolean;
}

export function parseRace(data: z.infer<typeof raceSchema>): RaceMarket | undefined {
  const markets = data[0]?.markets ?? [];
  const d = markets.find((m) => m.groupItemTitle?.includes("(D)"));
  const r = markets.find((m) => m.groupItemTitle?.includes("(R)"));
  if (!d?.groupItemTitle || !r?.groupItemTitle) return undefined;
  const dYes = Number(d.outcomePrices?.[0]);
  const rYes = Number(r.outcomePrices?.[0]);
  if (!Number.isFinite(dYes) || !Number.isFinite(rYes)) return undefined;
  return {
    dName: d.groupItemTitle.replace("(D)", "").trim(),
    rName: r.groupItemTitle.replace("(R)", "").trim(),
    dYes,
    rYes,
    closed: d.closed === true && r.closed === true,
  };
}

export async function fetchRace(slug: string): Promise<RaceMarket | undefined> {
  return parseRace(
    await getJson(
      `https://gamma-api.polymarket.com/events?slug=${encodeURIComponent(slug)}`,
      raceSchema,
    ),
  );
}
