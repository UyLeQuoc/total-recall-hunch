import type { Db } from "../db/client.ts";
import type { Snapshot } from "./evaluate.ts";
import type { PastGame } from "./replay.ts";

interface SnapshotRow {
  event_id: string;
  source: string;
  home_prob: number;
  at: Date;
  kind: Snapshot["kind"];
}

export async function loadPastGames(
  db: Db,
  from: Date,
  to: Date,
  league: "NBA" | "SENATE" = "NBA",
): Promise<PastGame[]> {
  const events = await db<
    {
      id: string;
      title: string;
      home: string;
      away: string;
      starts_at: Date;
      winner: "home" | "away";
    }[]
  >`
    select id, coalesce(title, away || ' @ ' || home) as title, home, away, starts_at, winner from events
    where league = ${league} and status = 'post' and winner is not null
      and starts_at >= ${from} and starts_at < ${to}
    order by starts_at`;
  if (events.length === 0) return [];
  const ids = events.map((e) => e.id);
  const snaps = await db<SnapshotRow[]>`
    select event_id, source, home_prob, at, kind from snapshots where event_id in ${db(ids)}`;
  const byEvent = new Map<string, Snapshot[]>();
  for (const s of snaps) {
    const list = byEvent.get(s.event_id) ?? [];
    list.push({ source: s.source, homeProb: s.home_prob, at: s.at, kind: s.kind });
    byEvent.set(s.event_id, list);
  }
  return events.map((e) => ({
    id: e.id,
    title: e.title,
    home: e.home,
    away: e.away,
    startsAt: e.starts_at,
    winner: e.winner,
    snapshots: byEvent.get(e.id) ?? [],
  }));
}
