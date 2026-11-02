import type { BtcRule, Condition, MarketSource, SportsRule } from "../compiler/rule.ts";
import type { Candle } from "../ingest/coinbase.ts";
import { easternDate } from "../ingest/teams.ts";
import { brier, mean } from "../score/brier.ts";
import { evaluateBtc, evaluateSports, type Snapshot } from "./evaluate.ts";

const MINUTE = 60_000;
const SCAN_FROM_MS = 180 * MINUTE;
const SCAN_STEP_MS = 5 * MINUTE;
export const REPLAY_DAYS = 7;

export interface PastGame {
  id: string;
  home: string;
  away: string;
  startsAt: Date;
  winner: "home" | "away";
  snapshots: Snapshot[];
}

export interface ReplayFire {
  at: Date;
  label: string;
  pick: string;
  confidence: number;
  right: boolean;
}

export interface ReplayDay {
  day: string;
  fires: number;
  right: number;
}

export interface Replay {
  from: Date;
  to: Date;
  considered: number;
  skipped: number;
  fires: number;
  right: number;
  brier: number | null;
  against: { name: string; brier: number | null; compared: number };
  closingLines: number;
  days: ReplayDay[];
  recent: ReplayFire[];
}

function sourcesRead(rule: SportsRule): MarketSource[] {
  const out = new Set<MarketSource>();
  const add = (c: Condition) => {
    if (c.kind === "gap") {
      out.add(c.a);
      out.add(c.b);
    }
    if (c.kind === "price") out.add(c.source);
  };
  rule.when.all.forEach(add);
  const pick = rule.then[0];
  if ("favourite_of" in pick.side) out.add(pick.side.favourite_of);
  if ("underdog_of" in pick.side) out.add(pick.side.underdog_of);
  if ("price_of" in pick.confidence) out.add(pick.confidence.price_of);
  return [...out];
}

function emptyDays(from: Date, now: Date, dayOf: (d: Date) => string): ReplayDay[] {
  const labels: string[] = [];
  for (let t = from.getTime(); t < now.getTime(); t += 86_400_000) labels.push(dayOf(new Date(t)));
  labels.push(dayOf(now));
  return [...new Set(labels)].map((day) => ({ day, fires: 0, right: 0 }));
}

function scanTimes(lock: Date): Date[] {
  const times: Date[] = [];
  for (let t = lock.getTime() - SCAN_FROM_MS; t < lock.getTime(); t += SCAN_STEP_MS) {
    times.push(new Date(t));
  }
  return times;
}

function underLimit(perDay: Map<string, number>, day: string, limit: number): boolean {
  return (perDay.get(day) ?? 0) < limit;
}

export function replaySports(rule: SportsRule, games: PastGame[], now: Date): Replay {
  const from = new Date(now.getTime() - REPLAY_DAYS * 86_400_000);
  const days = emptyDays(from, now, easternDate);
  const needed = sourcesRead(rule);
  const perDay = new Map<string, number>();
  const ruleScores: number[] = [];
  const againstScores: number[] = [];
  const recent: ReplayFire[] = [];
  let considered = 0;
  let skipped = 0;
  let fires = 0;
  let right = 0;
  let closingLines = 0;

  const window = games
    .filter((g) => g.startsAt >= from && g.startsAt < now)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  for (const game of window) {
    considered++;
    if (needed.some((s) => !game.snapshots.some((x) => x.source === s))) {
      skipped++;
      continue;
    }
    const day = easternDate(game.startsAt);
    if (!underLimit(perDay, day, rule.limits.picks_per_day)) continue;
    for (const at of scanTimes(game.startsAt)) {
      const verdict = evaluateSports(rule, at, game.startsAt, game.snapshots, true);
      if (!verdict.fired) continue;
      const { pick } = verdict;
      const isRight = pick.side === game.winner;
      fires++;
      if (isRight) right++;
      perDay.set(day, (perDay.get(day) ?? 0) + 1);
      const bucket = days.find((d) => d.day === day);
      if (bucket) {
        bucket.fires++;
        if (isRight) bucket.right++;
      }
      if (Object.values(pick.seen).some((s) => s?.closing)) closingLines++;
      ruleScores.push(brier(pick.confidence, isRight));
      const against = pick.seen[rule.against];
      if (against) {
        const p = pick.side === "home" ? against.homeProb : 1 - against.homeProb;
        againstScores.push(brier(p, isRight));
      }
      recent.push({
        at,
        label: `${game.away} @ ${game.home}`,
        pick: pick.side === "home" ? game.home : game.away,
        confidence: pick.confidence,
        right: isRight,
      });
      break;
    }
  }
  return {
    from,
    to: now,
    considered,
    skipped,
    fires,
    right,
    brier: mean(ruleScores),
    against: { name: rule.against, brier: mean(againstScores), compared: againstScores.length },
    closingLines,
    days,
    recent: recent.slice(-6).reverse(),
  };
}

const UTC_DAY = (d: Date) => d.toISOString().slice(0, 10);

export function movePct(c: Candle): number {
  return ((c.close - c.open) / c.open) * 100;
}

export function replayBtc(rule: BtcRule, candles: Candle[], now: Date): Replay {
  const from = new Date(now.getTime() - REPLAY_DAYS * 86_400_000);
  const days = emptyDays(from, now, UTC_DAY);
  const perDay = new Map<string, number>();
  const ruleScores: number[] = [];
  const recent: ReplayFire[] = [];
  let fires = 0;
  let right = 0;
  const window = candles.filter((c) => c.startAt >= from && c.startAt < now);
  for (let i = 0; i + 1 < window.length; i++) {
    const current = window[i];
    const next = window[i + 1];
    if (!current || !next) continue;
    if (next.startAt.getTime() - current.startAt.getTime() !== 5 * MINUTE) continue;
    const verdict = evaluateBtc(rule, movePct(current));
    if (!verdict.fired) continue;
    const day = UTC_DAY(next.startAt);
    if (!underLimit(perDay, day, rule.limits.picks_per_day)) continue;
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
    const up = next.close > next.open;
    const down = next.close < next.open;
    const isRight = verdict.pick.direction === "up" ? up : down;
    fires++;
    if (isRight) right++;
    const bucket = days.find((d) => d.day === day);
    if (bucket) {
      bucket.fires++;
      if (isRight) bucket.right++;
    }
    ruleScores.push(brier(verdict.pick.confidence, isRight));
    recent.push({
      at: next.startAt,
      label: `BTC ${movePct(current) >= 0 ? "+" : ""}${movePct(current).toFixed(2)}%`,
      pick: verdict.pick.direction,
      confidence: verdict.pick.confidence,
      right: isRight,
    });
  }
  return {
    from,
    to: now,
    considered: Math.max(window.length - 1, 0),
    skipped: 0,
    fires,
    right,
    brier: mean(ruleScores),
    against: { name: "a coin flip", brier: fires > 0 ? 0.25 : null, compared: fires },
    closingLines: 0,
    days,
    recent: recent.slice(-6).reverse(),
  };
}
