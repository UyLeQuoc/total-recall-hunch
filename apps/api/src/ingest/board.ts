import type { MarketSource } from "../compiler/rule.ts";
import type { Db } from "../db/client.ts";
import { maxAgeMs } from "../monitor/evaluate.ts";
import { type AgentCall, agentCall, type TrustCitation } from "../score/voices.ts";

const SOURCES: MarketSource[] = ["books", "polymarket", "kalshi"];
const SERIES_POINTS = 24;
const RADAR_PTS = 5;

export interface BoardPrice {
  source: MarketSource;
  homeProb: number;
  at: string;
  fresh: boolean;
  series: number[];
}

export interface BoardGame {
  id: string;
  home: string;
  away: string;
  homeName: string;
  awayName: string;
  startsAt: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  prices: BoardPrice[];
  gap: { a: MarketSource; b: MarketSource; pts: number } | null;
  flagged: boolean;
  call: AgentCall | null;
}

export function widestGap(prices: BoardPrice[]): BoardGame["gap"] {
  const fresh = prices.filter((p) => p.fresh);
  let best: BoardGame["gap"] = null;
  for (let i = 0; i < fresh.length; i++) {
    for (let j = i + 1; j < fresh.length; j++) {
      const a = fresh[i];
      const b = fresh[j];
      if (!a || !b) continue;
      const pts = Math.abs(a.homeProb - b.homeProb) * 100;
      if (!best || pts > best.pts) best = { a: a.source, b: b.source, pts };
    }
  }
  return best;
}

export async function loadBoard(
  db: Db,
  trust: Map<string, TrustCitation>,
  now = new Date(),
): Promise<BoardGame[]> {
  const events = await db<
    {
      id: string;
      home: string;
      away: string;
      home_name: string;
      away_name: string;
      starts_at: Date;
      status: string;
      home_score: number | null;
      away_score: number | null;
    }[]
  >`
    select id, home, away, home_name, away_name, starts_at, status, home_score, away_score from events
    where league = 'NBA' and starts_at > ${new Date(now.getTime() - 4 * 3_600_000)}
      and starts_at < ${new Date(now.getTime() + 30 * 3_600_000)}
    order by starts_at, id`;
  if (events.length === 0) return [];
  const snaps = await db<{ event_id: string; source: MarketSource; home_prob: number; at: Date }[]>`
    select event_id, source, home_prob, at from snapshots
    where event_id in ${db(events.map((e) => e.id))} and kind = 'live'
    order by at`;
  return events.map((e) => {
    const prices: BoardPrice[] = [];
    for (const source of SOURCES) {
      const list = snaps.filter((s) => s.event_id === e.id && s.source === source);
      const last = list.at(-1);
      if (!last) continue;
      const cutoff = e.status === "pre" ? now : e.starts_at;
      prices.push({
        source,
        homeProb: last.home_prob,
        at: last.at.toISOString(),
        fresh: cutoff.getTime() - last.at.getTime() <= maxAgeMs(cutoff, e.starts_at),
        series: list.slice(-SERIES_POINTS).map((s) => s.home_prob),
      });
    }
    const gap = widestGap(prices);
    const fresh: Partial<Record<MarketSource, number>> = {};
    for (const p of prices) if (p.fresh) fresh[p.source] = p.homeProb;
    return {
      id: e.id,
      home: e.home,
      away: e.away,
      homeName: e.home_name,
      awayName: e.away_name,
      startsAt: e.starts_at.toISOString(),
      status: e.status,
      homeScore: e.home_score,
      awayScore: e.away_score,
      prices,
      gap,
      flagged: gap !== null && gap.pts >= RADAR_PTS,
      call: agentCall(fresh, trust),
    };
  });
}
