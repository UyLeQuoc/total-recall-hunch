import { z } from "zod";
import { getJson } from "./http.ts";

const BASE = "https://api.exchange.coinbase.com/products/BTC-USD";

const tickerSchema = z.object({ price: z.coerce.number(), time: z.string() });
const candlesSchema = z.array(
  z.tuple([z.number(), z.number(), z.number(), z.number(), z.number()]).rest(z.number()),
);

export interface Candle {
  startAt: Date;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface Tick {
  price: number;
  at: Date;
}

export async function fetchTicker(): Promise<Tick> {
  const t = await getJson(`${BASE}/ticker`, tickerSchema);
  return { price: t.price, at: new Date(t.time) };
}

export async function fetchCandles(
  granularitySec: 60 | 300,
  window?: { from: Date; to: Date },
): Promise<Candle[]> {
  const range = window ? `&start=${window.from.toISOString()}&end=${window.to.toISOString()}` : "";
  const rows = await getJson(
    `${BASE}/candles?granularity=${granularitySec}${range}`,
    candlesSchema,
  );
  return rows
    .map(([time, low, high, open, close]) => ({
      startAt: new Date(time * 1000),
      open,
      high,
      low,
      close,
    }))
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}
