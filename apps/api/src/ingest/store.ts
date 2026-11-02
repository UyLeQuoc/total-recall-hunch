import type { Db } from "../db/client.ts";
import type { Candle } from "./coinbase.ts";
import type { EspnGame } from "./espn.ts";

export type Source = "books" | "polymarket" | "kalshi" | `book:${string}`;
export type SnapshotKind = "live" | "close" | "history";

export function eventId(game: EspnGame): string {
  return `nba:${game.espnId}`;
}

export interface EventRow {
  id: string;
  league: "NBA" | "SENATE";
  title: string;
  home: string;
  away: string;
  homeName: string;
  awayName: string;
  startsAt: Date;
  status: "pre" | "in" | "post";
  winner: "home" | "away" | null;
  homeScore: number | null;
  awayScore: number | null;
}

export async function upsertEvent(db: Db, e: EventRow): Promise<void> {
  await db`
    insert into events (id, league, title, home, away, home_name, away_name, starts_at, status, winner, home_score, away_score)
    values (${e.id}, ${e.league}, ${e.title}, ${e.home}, ${e.away}, ${e.homeName}, ${e.awayName},
            ${e.startsAt}, ${e.status}, ${e.winner}, ${e.homeScore}, ${e.awayScore})
    on conflict (id) do update set
      title = excluded.title, home = excluded.home, away = excluded.away,
      home_name = excluded.home_name, away_name = excluded.away_name,
      starts_at = excluded.starts_at, status = excluded.status,
      winner = coalesce(excluded.winner, events.winner),
      home_score = excluded.home_score, away_score = excluded.away_score, updated_at = now()`;
}

export async function upsertGame(db: Db, game: EspnGame): Promise<void> {
  const winner =
    game.state === "post" ? (game.home.winner ? "home" : game.away.winner ? "away" : null) : null;
  await upsertEvent(db, {
    id: eventId(game),
    league: "NBA",
    title: `${game.away.abbr} @ ${game.home.abbr}`,
    home: game.home.abbr,
    away: game.away.abbr,
    homeName: game.home.name,
    awayName: game.away.name,
    startsAt: game.startsAt,
    status: game.state,
    winner,
    homeScore: game.home.score,
    awayScore: game.away.score,
  });
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
