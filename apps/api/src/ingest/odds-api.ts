import { z } from "zod";
import type { Db } from "../db/client.ts";
import { homeProbWithoutVig } from "./odds.ts";

export const ODDS_BOOKS = [
  "draftkings",
  "fanduel",
  "betmgm",
  "williamhill_us",
  "pinnacle",
  "betfair_ex_eu",
];
const CALL_EVERY_MS = 30 * 60_000;
const LOOKAHEAD_MS = 3 * 3_600_000;
const MATCH_WINDOW_MS = 3 * 3_600_000;

const eventsSchema = z.array(
  z.object({
    commence_time: z.string(),
    home_team: z.string(),
    away_team: z.string(),
    bookmakers: z.array(
      z.object({
        key: z.string(),
        last_update: z.string(),
        markets: z.array(
          z.object({
            key: z.string(),
            outcomes: z.array(z.object({ name: z.string(), price: z.number() })),
          }),
        ),
      }),
    ),
  }),
);

export interface BookQuote {
  book: string;
  homeProb: number;
  at: Date;
}

export interface OddsEvent {
  commence: Date;
  home: string;
  away: string;
  books: BookQuote[];
}

export function parseOddsEvents(data: unknown): OddsEvent[] {
  const events = eventsSchema.parse(data);
  return events.map((e) => {
    const books: BookQuote[] = [];
    for (const b of e.bookmakers) {
      const h2h = b.markets.find((m) => m.key === "h2h");
      const home = h2h?.outcomes.find((o) => o.name === e.home_team)?.price;
      const away = h2h?.outcomes.find((o) => o.name === e.away_team)?.price;
      if (home === undefined || away === undefined) continue;
      const p = homeProbWithoutVig(home, away);
      if (p !== undefined) books.push({ book: b.key, homeProb: p, at: new Date(b.last_update) });
    }
    return { commence: new Date(e.commence_time), home: e.home_team, away: e.away_team, books };
  });
}

export function matchGame(
  events: OddsEvent[],
  game: { homeNickname: string; awayNickname: string; startsAt: Date },
): OddsEvent | undefined {
  return events.find(
    (e) =>
      e.home.endsWith(game.homeNickname) &&
      e.away.endsWith(game.awayNickname) &&
      Math.abs(e.commence.getTime() - game.startsAt.getTime()) <= MATCH_WINDOW_MS,
  );
}

export function consensus(probs: number[]): number | undefined {
  if (probs.length === 0) return undefined;
  return probs.reduce((a, b) => a + b, 0) / probs.length;
}

export function oddsCallDue(
  now: Date,
  locks: Date[],
  lastCall: Date | undefined,
  callsToday: number,
  cap: number,
): boolean {
  if (callsToday >= cap) return false;
  const soon = locks.some((l) => l > now && l.getTime() - now.getTime() <= LOOKAHEAD_MS);
  if (!soon) return false;
  return !lastCall || now.getTime() - lastCall.getTime() >= CALL_EVERY_MS;
}

let lastCall: Date | undefined;

export async function callsToday(
  db: Db,
  now: Date,
): Promise<{ calls: number; remaining: number | null }> {
  const rows = await db<{ calls: number; remaining: number | null }[]>`
    select calls, remaining from odds_api_usage where day = ${now.toISOString().slice(0, 10)}`;
  return rows[0] ?? { calls: 0, remaining: null };
}

export async function fetchNbaOdds(
  db: Db,
  apiKey: string,
  cap: number,
  locks: Date[],
  now = new Date(),
): Promise<OddsEvent[] | undefined> {
  const today = await callsToday(db, now);
  if (!oddsCallDue(now, locks, lastCall, today.calls, cap)) return undefined;
  lastCall = now;
  const url = `https://api.the-odds-api.com/v4/sports/basketball_nba/odds?apiKey=${encodeURIComponent(apiKey)}&markets=h2h&oddsFormat=american&bookmakers=${ODDS_BOOKS.join(",")}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  const remaining = Number(res.headers.get("x-requests-remaining"));
  await db`insert into odds_api_usage (day, calls, remaining)
           values (${now.toISOString().slice(0, 10)}, 1, ${Number.isFinite(remaining) ? remaining : null})
           on conflict (day) do update set calls = odds_api_usage.calls + 1, remaining = excluded.remaining`;
  if (!res.ok) throw new Error(`The Odds API answered ${res.status}`);
  return parseOddsEvents(await res.json());
}
