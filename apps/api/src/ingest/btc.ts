import type { Logger } from "@hunch/chain";
import type { Db } from "../db/client.ts";
import { type Candle, fetchCandles, fetchTicker, type Tick } from "./coinbase.ts";
import { upsertCandles } from "./store.ts";

const DAY = 86_400_000;
const FIVE_MIN = 300_000;
const PER_REQUEST = 300;
const TICK_CACHE_MS = 3_000;
const MINUTE_CACHE_MS = 10_000;

export async function backfillBtc(db: Db, log: Logger, now = new Date()): Promise<void> {
  const since = new Date(now.getTime() - 7 * DAY);
  const have = await db<{ n: number }[]>`
    select count(*)::int as n from btc_candles where start_at >= ${since}`;
  if ((have[0]?.n ?? 0) >= 7 * 288 - 12) return;
  let from = since;
  while (from < now) {
    const to = new Date(Math.min(from.getTime() + PER_REQUEST * FIVE_MIN, now.getTime()));
    await upsertCandles(db, await fetchCandles(300, { from, to }));
    from = to;
  }
  log.info("btc backfill", { since: since.toISOString() });
}

export async function refreshBtc(db: Db): Promise<void> {
  await upsertCandles(db, await fetchCandles(300));
}

let tick: { value: Tick; fetchedAt: number } | undefined;
let minutes: { value: Candle[]; fetchedAt: number } | undefined;

export async function currentTick(): Promise<Tick> {
  if (tick && Date.now() - tick.fetchedAt < TICK_CACHE_MS) return tick.value;
  const value = await fetchTicker();
  tick = { value, fetchedAt: Date.now() };
  return value;
}

export async function recentMinutes(): Promise<Candle[]> {
  if (minutes && Date.now() - minutes.fetchedAt < MINUTE_CACHE_MS) return minutes.value;
  const value = await fetchCandles(60);
  minutes = { value, fetchedAt: Date.now() };
  return value;
}

export async function storedFiveMinute(db: Db, since: Date): Promise<Candle[]> {
  const rows = await db<
    { start_at: Date; open: number; high: number; low: number; close: number }[]
  >`select start_at, open, high, low, close from btc_candles where start_at >= ${since} order by start_at`;
  return rows.map((r) => ({
    startAt: r.start_at,
    open: r.open,
    high: r.high,
    low: r.low,
    close: r.close,
  }));
}
