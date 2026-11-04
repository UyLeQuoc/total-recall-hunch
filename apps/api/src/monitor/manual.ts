import type { Agent } from "../anchor/keys.ts";
import type { PickPayload } from "../anchor/payload.ts";
import type { MarketSource } from "../compiler/rule.ts";
import type { Db } from "../db/client.ts";
import { freshPrice, type Snapshot } from "./evaluate.ts";
import { createSignedPick, type SignedResult } from "./signed.ts";

const SOURCES: MarketSource[] = ["books", "polymarket", "kalshi"];

export async function manualPick(
  db: Db,
  agent: Agent,
  address: string,
  eventId: string,
  side: "home" | "away",
  confidence: number,
  now = new Date(),
): Promise<SignedResult | { ok: false; status: 404; reason: string }> {
  const events = await db<
    { league: string; home: string; away: string; starts_at: Date; status: string }[]
  >`select league, home, away, starts_at, status from events where id = ${eventId}`;
  const event = events[0];
  if (!event) return { ok: false, status: 404, reason: "No game has that id." };
  if (event.status !== "pre") {
    return { ok: false, status: 409, reason: "That game has locked. Picks close at tip-off." };
  }
  const rows = await db<{ source: MarketSource; home_prob: number; at: Date }[]>`
    select source, home_prob, at from snapshots
    where event_id = ${eventId} and kind = 'live' and at > ${new Date(now.getTime() - 2 * 3_600_000)}`;
  const snaps: Snapshot[] = rows.map((r) => ({
    source: r.source,
    homeProb: r.home_prob,
    at: r.at,
    kind: "live",
  }));
  const seen: PickPayload["seen"] = {};
  for (const s of SOURCES) {
    const p = freshPrice(snaps, s, now, event.starts_at, false);
    if (p) seen[s] = { p: Math.round(p.homeProb * 10_000) / 10_000, at: p.at.toISOString() };
  }
  return createSignedPick(
    db,
    agent,
    {
      address,
      market: event.league === "SENATE" ? "senate-winner" : "nba-ml",
      ruleId: null,
      version: null,
      eventId,
      side,
      team: side === "home" ? event.home : event.away,
      confidence,
      seen,
      lock: event.starts_at,
      why: "picked by hand",
      limitPerDay: null,
    },
    now,
  );
}
