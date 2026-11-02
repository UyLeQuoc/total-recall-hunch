import type { Logger } from "@hunch/chain";
import type { Db } from "../db/client.ts";
import { snapshotDue } from "./cadence.ts";
import * as kalshi from "./kalshi.ts";
import { normalisedPair } from "./odds.ts";
import * as polymarket from "./polymarket.ts";
import { candidateLabel, STATES, stateSlug } from "./states.ts";
import { addSnapshot, lastSnapshotAt, upsertEvent } from "./store.ts";

export const SENATE_YEAR = "26";
export const FIRST_POLLS_CLOSE = new Date("2026-11-03T23:00:00Z");
const DISCOVER_EVERY_MS = 6 * 3_600_000;

let discovered: { at: number; races: kalshi.SenateRace[] } | undefined;

export function raceWinner(
  d: kalshi.KalshiMarket | undefined,
  r: kalshi.KalshiMarket | undefined,
  pm: polymarket.RaceMarket | undefined,
): "home" | "away" | null {
  if (d?.result === "yes" || r?.result === "no") return "home";
  if (r?.result === "yes" || d?.result === "no") return "away";
  if (pm?.closed && pm.dYes >= 0.99) return "home";
  if (pm?.closed && pm.rYes >= 0.99) return "away";
  return null;
}

export function raceStatus(now: Date, winner: "home" | "away" | null): "pre" | "in" | "post" {
  if (winner) return "post";
  return now < FIRST_POLLS_CLOSE ? "pre" : "in";
}

export function senateEventId(eventTicker: string): string {
  return `senate:${eventTicker}`;
}

async function races(log: Logger, now: Date): Promise<kalshi.SenateRace[]> {
  if (!discovered || now.getTime() - discovered.at > DISCOVER_EVERY_MS) {
    const found = await kalshi.discoverSenateRaces(Object.keys(STATES), SENATE_YEAR);
    discovered = { at: now.getTime(), races: found };
    log.info("senate races found", { races: found.length });
  }
  return discovered.races;
}

export async function ingestSenate(db: Db, log: Logger, now = new Date()): Promise<void> {
  const list = await races(log, now);
  if (list.length === 0) return;
  const markets = await kalshi.fetchMarkets(list.flatMap((r) => [r.dTicker, r.rTicker]));
  let written = 0;
  for (const race of list) {
    const id = senateEventId(race.eventTicker);
    const stateName = STATES[race.state] ?? race.state;
    const d = markets.get(race.dTicker);
    const r = markets.get(race.rTicker);
    const pmDue = snapshotDue(now, FIRST_POLLS_CLOSE, await lastSnapshotAt(db, id, "polymarket"));
    const unresolved = now >= FIRST_POLLS_CLOSE;
    let pm: polymarket.RaceMarket | undefined;
    if (pmDue || unresolved) {
      try {
        pm = await polymarket.fetchRace(`${stateSlug(stateName)}-senate-election-winner`);
      } catch (err) {
        log.warn("polymarket race unavailable", { event: id, reason: String(err) });
      }
    }
    const dName = d?.name || pm?.dName || "Democrat";
    const rName = r?.name || pm?.rName || "Republican";
    const winner = raceWinner(d, r, pm);
    await upsertEvent(db, {
      id,
      league: "SENATE",
      title: `${stateName} Senate`,
      home: `${candidateLabel(dName, "D")} (D)`,
      away: `${candidateLabel(rName, "R")} (R)`,
      homeName: dName,
      awayName: rName,
      startsAt: FIRST_POLLS_CLOSE,
      status: raceStatus(now, winner),
      winner,
      homeScore: null,
      awayScore: null,
    });
    const k =
      d?.mid !== undefined && r?.mid !== undefined ? normalisedPair(d.mid, r.mid) : undefined;
    if (
      k !== undefined &&
      snapshotDue(now, FIRST_POLLS_CLOSE, await lastSnapshotAt(db, id, "kalshi"))
    ) {
      await addSnapshot(db, id, "kalshi", k, now, "live");
      written++;
    }
    const p = pm ? normalisedPair(pm.dYes, pm.rYes) : undefined;
    if (p !== undefined && pmDue) {
      await addSnapshot(db, id, "polymarket", p, now, "live");
      written++;
    }
  }
  log.info("senate ingest", { races: list.length, snapshots: written });
}
