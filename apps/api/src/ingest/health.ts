import { suiFallback } from "@hunch/chain";
import { pendingLeaves } from "../anchor/batcher.ts";
import { usageToday } from "../anchor/meter.ts";
import type { Db } from "../db/client.ts";
import { memoryCounts } from "../memory/queue.ts";
import type { Services } from "../services.ts";
import { callsToday, ODDS_BOOKS } from "./odds-api.ts";

const HOURS = 24;

export interface SourceHealth {
  source: string;
  last: string | null;
  hourly: number[];
}

export interface Health {
  now: string;
  sources: SourceHealth[];
  backfill: { games: number; withPrices: number; btcCandles: number };
  tatum: { calls: Record<string, number>; credits: number; budget: number; fallback: boolean };
  keys: {
    model: boolean;
    tatum: boolean;
    memory: boolean;
    sponsor: boolean;
    anchor: boolean;
    agent: boolean;
    odds: boolean;
  };
  network: string;
  agent: string | null;
  anchors: {
    pendingPicks: number;
    batches: number;
    last: { digest: string | null; status: string; count: number; at: string } | null;
  };
  memories: Record<string, number>;
  onRecord: { rules: number; picks: number; delegations: number };
  oddsApi: { key: boolean; calls: number; cap: number; remaining: number | null; books: string[] };
}

function hourlyCounts(
  rows: { source: string; hour: number; n: number }[],
  source: string,
): number[] {
  const out = new Array<number>(HOURS).fill(0);
  for (const r of rows) {
    if (r.source === source && r.hour >= 0 && r.hour < HOURS) out[HOURS - 1 - r.hour] = r.n;
  }
  return out;
}

export async function loadHealth(s: Services, now = new Date()): Promise<Health> {
  const { db, env } = s;
  const since = new Date(now.getTime() - HOURS * 3_600_000);
  const hourly = await db<{ source: string; hour: number; n: number }[]>`
    select source, floor(extract(epoch from (${now}::timestamptz - at)) / 3600)::int as hour, count(*)::int as n
    from snapshots where kind = 'live' and at >= ${since} group by 1, 2`;
  const last = await db<{ source: string; at: Date }[]>`
    select source, max(at) as at from snapshots where kind = 'live' group by source`;
  const btc = await db<{ hour: number; n: number }[]>`
    select floor(extract(epoch from (${now}::timestamptz - start_at)) / 3600)::int as hour, count(*)::int as n
    from btc_candles where start_at >= ${since} group by 1`;
  const btcLast = await db<{ at: Date | null; total: number }[]>`
    select max(start_at) as at, count(*)::int as total from btc_candles`;
  const games = await db<{ games: number; with_prices: number }[]>`
    select count(*)::int as games,
      count(*) filter (where exists (select 1 from snapshots s where s.event_id = e.id))::int as with_prices
    from events e where e.status = 'post'`;
  const sources: SourceHealth[] = ["books", "polymarket", "kalshi", "book:pinnacle"].map(
    (source) => ({
      source,
      last: last.find((l) => l.source === source)?.at.toISOString() ?? null,
      hourly: hourlyCounts(hourly, source),
    }),
  );
  sources.push({
    source: "btc",
    last: btcLast[0]?.at?.toISOString() ?? null,
    hourly: hourlyCounts(
      btc.map((b) => ({ source: "btc", hour: b.hour, n: b.n })),
      "btc",
    ),
  });
  return {
    now: now.toISOString(),
    sources,
    backfill: {
      games: games[0]?.games ?? 0,
      withPrices: games[0]?.with_prices ?? 0,
      btcCandles: btcLast[0]?.total ?? 0,
    },
    tatum: {
      ...(await usageToday(db, now)),
      budget: env.DAILY_CREDIT_BUDGET,
      fallback: suiFallback("testnet") !== null,
    },
    keys: {
      model: Boolean(env.OPENROUTER_API_KEY),
      tatum: Boolean(env.TATUM_API_KEY_TESTNET),
      memory: Boolean(env.MEMWAL_ACCOUNT_ID),
      sponsor: Boolean(env.SUI_SPONSOR_KEY),
      anchor: Boolean(env.HUNCH_PACKAGE_ID),
      agent: Boolean(s.agent),
      odds: Boolean(env.ODDS_API_KEY),
    },
    network: s.anchor?.network ?? "testnet",
    agent: s.agent?.address ?? null,
    anchors: await anchorSummary(db),
    memories: await memoryCounts(db),
    onRecord: (await recordCounts(db))[0] ?? { rules: 0, picks: 0, delegations: 0 },
    oddsApi: {
      key: Boolean(env.ODDS_API_KEY),
      ...(await callsToday(db, now)),
      cap: env.ODDS_API_DAILY_CALLS,
      books: ODDS_BOOKS,
    },
  };
}

async function anchorSummary(db: Db): Promise<Health["anchors"]> {
  const last = await db<
    { digest: string | null; status: string; count: number; created_at: Date }[]
  >`
    select digest, status, count, created_at from anchors order by created_at desc limit 1`;
  const batches = await db<
    { n: number }[]
  >`select count(*)::int as n from anchors where status = 'anchored'`;
  const l = last[0];
  return {
    pendingPicks: await pendingLeaves(db),
    batches: batches[0]?.n ?? 0,
    last: l
      ? { digest: l.digest, status: l.status, count: l.count, at: l.created_at.toISOString() }
      : null,
  };
}

function recordCounts(db: Db) {
  return db<{ rules: number; picks: number; delegations: number }[]>`
    select (select count(*)::int from rule_versions where stage = 'on_record') as rules,
           (select count(*)::int from picks where stage = 'on_record') as picks,
           (select count(*)::int from delegations where revoked_at is null) as delegations`;
}
