import type { Logger } from "@hunch/chain";
import type { Db } from "../db/client.ts";
import { maxAgeMs } from "../monitor/evaluate.ts";
import { snapshotDue } from "./cadence.ts";
import { type EspnGame, fetchClosingBooksProb, fetchScoreboard } from "./espn.ts";
import * as kalshi from "./kalshi.ts";
import { consensus, fetchNbaOdds, matchGame, type OddsEvent } from "./odds-api.ts";
import * as polymarket from "./polymarket.ts";
import { addSnapshot, eventId, lastSnapshotAt, upsertGame } from "./store.ts";
import { easternDate, kalshiEventTicker, type Matchup, polymarketSlug } from "./teams.ts";

const HOUR = 3_600_000;
const HISTORY_BEFORE_LOCK_MS = 3 * HOUR;
const BACKFILL_DAYS = 7;

function matchup(game: EspnGame): Matchup {
  return { away: game.away.abbr, home: game.home.abbr, startsAt: game.startsAt };
}

async function upcomingGames(now: Date): Promise<EspnGame[]> {
  const days = [easternDate(now), easternDate(new Date(now.getTime() + 24 * HOUR))];
  const yesterday = easternDate(new Date(now.getTime() - 24 * HOUR));
  const all = await Promise.all([yesterday, ...days].map(fetchScoreboard));
  return all.flat();
}

export interface OddsApiConfig {
  apiKey: string | undefined;
  dailyCalls: number;
}

async function freshBookQuotes(db: Db, id: string, now: Date, lock: Date): Promise<number[]> {
  const rows = await db<{ source: string; home_prob: number }[]>`
    select distinct on (source) source, home_prob from snapshots
    where event_id = ${id} and source like 'book:%' and source <> 'book:draftkings'
      and at > ${new Date(now.getTime() - maxAgeMs(now, lock))}
    order by source, at desc`;
  return rows.map((r) => r.home_prob);
}

export async function ingestNba(
  db: Db,
  log: Logger,
  oddsApi: OddsApiConfig = { apiKey: undefined, dailyCalls: 0 },
  now = new Date(),
): Promise<void> {
  const games = await upcomingGames(now);
  for (const game of games) await upsertGame(db, game);

  const pre = games.filter((g) => g.state === "pre");
  let kalshiProbs: Map<string, number> | undefined;
  try {
    kalshiProbs = await kalshi.fetchOpenGames();
  } catch (err) {
    log.warn("kalshi unavailable", { reason: String(err) });
  }
  let odds: OddsEvent[] | undefined;
  if (oddsApi.apiKey) {
    try {
      odds = await fetchNbaOdds(
        db,
        oddsApi.apiKey,
        oddsApi.dailyCalls,
        pre.map((g) => g.startsAt),
        now,
      );
    } catch (err) {
      log.warn("the odds api unavailable", { reason: String(err) });
    }
  }

  let written = 0;
  for (const game of pre) {
    const id = eventId(game);
    const match = odds
      ? matchGame(odds, {
          homeNickname: game.home.name,
          awayNickname: game.away.name,
          startsAt: game.startsAt,
        })
      : undefined;
    for (const quote of match?.books ?? []) {
      await addSnapshot(db, id, `book:${quote.book}`, quote.homeProb, now, "live");
      written++;
    }
    const others =
      match || game.booksHomeProb !== undefined
        ? await freshBookQuotes(db, id, now, game.startsAt)
        : [];
    const books = consensus(
      game.booksHomeProb !== undefined ? [game.booksHomeProb, ...others] : others,
    );
    if (
      books !== undefined &&
      (match !== undefined ||
        snapshotDue(now, game.startsAt, await lastSnapshotAt(db, id, "books")))
    ) {
      await addSnapshot(db, id, "books", books, now, "live");
      if (game.booksHomeProb !== undefined) {
        await addSnapshot(db, id, "book:draftkings", game.booksHomeProb, now, "live");
      }
      written++;
    }
    const k = kalshiProbs?.get(kalshiEventTicker(matchup(game)));
    if (
      k !== undefined &&
      snapshotDue(now, game.startsAt, await lastSnapshotAt(db, id, "kalshi"))
    ) {
      await addSnapshot(db, id, "kalshi", k, now, "live");
      written++;
    }
    if (snapshotDue(now, game.startsAt, await lastSnapshotAt(db, id, "polymarket"))) {
      try {
        const pm = await polymarket.fetchGame(polymarketSlug(matchup(game)), game.home.name);
        if (pm) {
          await addSnapshot(db, id, "polymarket", pm.homeProb, now, "live");
          written++;
        } else {
          log.warn("polymarket has no moneyline matching the home team", { event: id });
        }
      } catch (err) {
        log.warn("polymarket unavailable", { event: id, reason: String(err) });
      }
    }
  }
  log.info("nba ingest", {
    games: games.length,
    upcoming: pre.length,
    snapshots: written,
    oddsApi: odds ? odds.length : "skipped",
  });
}

async function backfillGame(db: Db, game: EspnGame, log: Logger): Promise<void> {
  const id = eventId(game);
  const from = new Date(game.startsAt.getTime() - HISTORY_BEFORE_LOCK_MS);
  const to = game.startsAt;

  const close = await fetchClosingBooksProb(game.espnId).catch(() => undefined);
  if (close !== undefined) await addSnapshot(db, id, "books", close, game.startsAt, "close");

  try {
    const pm = await polymarket.fetchGame(polymarketSlug(matchup(game)), game.home.name);
    if (pm?.homeToken) {
      for (const point of await polymarket.fetchHistory(pm.homeToken, from, to)) {
        await addSnapshot(db, id, "polymarket", point.p, point.at, "history");
      }
    }
  } catch (err) {
    log.warn("polymarket history unavailable", { event: id, reason: String(err) });
  }

  try {
    const points = await kalshi.fetchHomeHistory(
      kalshiEventTicker(matchup(game)),
      game.home.abbr,
      from,
      to,
    );
    for (const [i, point] of points.entries()) {
      if (i % 5 === 0 || i === points.length - 1) {
        await addSnapshot(db, id, "kalshi", point.p, point.at, "history");
      }
    }
  } catch (err) {
    log.warn("kalshi history unavailable", { event: id, reason: String(err) });
  }

  await db`update events set backfilled_at = now() where id = ${id}`;
}

export async function backfillNba(db: Db, log: Logger, now = new Date()): Promise<void> {
  let done = 0;
  for (let d = BACKFILL_DAYS; d >= 1; d--) {
    const day = easternDate(new Date(now.getTime() - d * 24 * HOUR));
    const games = (await fetchScoreboard(day)).filter((g) => g.state === "post");
    for (const game of games) {
      await upsertGame(db, game);
      const rows = await db<{ backfilled_at: Date | null }[]>`
        select backfilled_at from events where id = ${eventId(game)}`;
      if (rows[0]?.backfilled_at) continue;
      await backfillGame(db, game, log);
      done++;
    }
  }
  log.info("nba backfill", { games: done });
}
