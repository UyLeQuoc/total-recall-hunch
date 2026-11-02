import { z } from "zod";
import { getJson } from "./http.ts";
import { normalisedPair } from "./odds.ts";

const BASE = "https://api.elections.kalshi.com/trade-api/v2";
const MAX_SPREAD = 0.1;

const dollars = z.string().optional();

const eventsSchema = z.object({
  events: z.array(
    z.object({
      event_ticker: z.string(),
      markets: z
        .array(
          z.object({
            ticker: z.string(),
            yes_bid_dollars: dollars,
            yes_ask_dollars: dollars,
          }),
        )
        .optional(),
    }),
  ),
});

const ohlc = z.object({ close_dollars: dollars }).optional();
const candlesSchema = z.object({
  candlesticks: z.array(
    z.object({ end_period_ts: z.number(), yes_bid: ohlc, yes_ask: ohlc, price: ohlc }),
  ),
});

function mid(bid: string | undefined, ask: string | undefined): number | undefined {
  const b = Number(bid);
  const a = Number(ask);
  if (!Number.isFinite(b) || !Number.isFinite(a) || a <= 0 || a - b > MAX_SPREAD) return undefined;
  return (a + b) / 2;
}

export async function fetchOpenGames(): Promise<Map<string, number>> {
  const data = await getJson(
    `${BASE}/events?series_ticker=KXNBAGAME&status=open&with_nested_markets=true&limit=200`,
    eventsSchema,
  );
  const homeProbs = new Map<string, number>();
  for (const event of data.events) {
    const home = event.event_ticker.slice(-3);
    const away = event.event_ticker.slice(-6, -3);
    const markets = event.markets ?? [];
    const homeMarket = markets.find((m) => m.ticker.endsWith(`-${home}`));
    const awayMarket = markets.find((m) => m.ticker.endsWith(`-${away}`));
    const h = mid(homeMarket?.yes_bid_dollars, homeMarket?.yes_ask_dollars);
    const a = mid(awayMarket?.yes_bid_dollars, awayMarket?.yes_ask_dollars);
    if (h === undefined || a === undefined) continue;
    const p = normalisedPair(h, a);
    if (p !== undefined) homeProbs.set(event.event_ticker, p);
  }
  return homeProbs;
}

export async function fetchHomeHistory(
  eventTicker: string,
  home: string,
  from: Date,
  to: Date,
): Promise<{ at: Date; p: number }[]> {
  const startTs = Math.floor(from.getTime() / 1000);
  const endTs = Math.floor(to.getTime() / 1000);
  const data = await getJson(
    `${BASE}/series/KXNBAGAME/markets/${eventTicker}-${home}/candlesticks?start_ts=${startTs}&end_ts=${endTs}&period_interval=1`,
    candlesSchema,
  );
  const out: { at: Date; p: number }[] = [];
  for (const c of data.candlesticks) {
    const p =
      mid(c.yes_bid?.close_dollars, c.yes_ask?.close_dollars) ?? Number(c.price?.close_dollars);
    if (Number.isFinite(p) && p > 0) out.push({ at: new Date(c.end_period_ts * 1000), p });
  }
  return out;
}
