import type { Db } from "../db/client.ts";
import type { Candle } from "./coinbase.ts";
import type { EspnGame } from "./espn.ts";

export type Source = "books" | "polymarket" | "kalshi";
export type SnapshotKind = "live" | "close" | "history";

export function eventId(game: EspnGame): string {
  return `nba:${game.espnId}`;
}

export async function upsertGame(db: Db, game: EspnGame): Promise<void> {
  const winner =
    game.state === "post" ? (game.home.winner ? "home" : game.away.winner ? "away" : null) : null;
  await db`
    insert into events (id, league, home, away, home_name, away_name, starts_at, status, winner, home_score, away_score)
    values (${eventId(game)}, 'NBA', ${game.home.abbr}, ${game.away.abbr}, ${game.home.name}, ${game.away.name},
            ${game.startsAt}, ${game.state}, ${winner}, ${game.home.score}, ${game.away.score})
    on conflict (id) do update set
      starts_at = excluded.starts_at, status = excluded.status, winner = excluded.winner,
      home_score = excluded.home_score, away_score = excluded.away_score, updated_at = now()`;
}

export async function addSnapshot(
  db: Db,
  event: string,
  source: Source,
  homeProb: number,
  at: Date,
  kind: SnapshotKind,
): Promise<void> {
  if (!Number.isFinite(homeProb) || homeProb <= 0 || homeProb >= 1) return;
  await db`
    insert into snapshots (event_id, source, home_prob, at, kind)
    values (${event}, ${source}, ${homeProb}, ${at}, ${kind})
    on conflict do nothing`;
}

export async function lastSnapshotAt(
  db: Db,
  event: string,
  source: Source,
): Promise<Date | undefined> {
  const rows = await db<{ at: Date }[]>`
    select max(at) as at from snapshots where event_id = ${event} and source = ${source}`;
  return rows[0]?.at ?? undefined;
}

export async function upsertCandles(db: Db, candles: Candle[]): Promise<void> {
  if (candles.length === 0) return;
  const rows = candles.map((c) => ({
    start_at: c.startAt,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));
  await db`
    insert into btc_candles ${db(rows, "start_at", "open", "high", "low", "close")}
    on conflict (start_at) do update set high = excluded.high, low = excluded.low, close = excluded.close`;
}
