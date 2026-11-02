import type { BtcRule, Condition, MarketSource, SportsRule } from "../compiler/rule.ts";

const MINUTE = 60_000;
const NEAR_LOCK_MS = 120 * MINUTE;
const NEAR_MAX_AGE_MS = 10 * MINUTE;
const FAR_MAX_AGE_MS = 60 * MINUTE;

export interface Snapshot {
  source: MarketSource;
  homeProb: number;
  at: Date;
  kind: "live" | "close" | "history";
}

export interface Seen {
  homeProb: number;
  at: Date;
  closing: boolean;
}

export type Side = "home" | "away";

export interface SportsPick {
  side: Side;
  confidence: number;
  seen: Partial<Record<MarketSource, Seen>>;
}

export type Verdict<P> = { fired: true; pick: P; why: string[] } | { fired: false; why: string[] };

export function maxAgeMs(now: Date, lock: Date): number {
  return lock.getTime() - now.getTime() <= NEAR_LOCK_MS ? NEAR_MAX_AGE_MS : FAR_MAX_AGE_MS;
}

export function freshPrice(
  snapshots: Snapshot[],
  source: MarketSource,
  now: Date,
  lock: Date,
  allowClosingLine: boolean,
): Seen | undefined {
  const limit = maxAgeMs(now, lock);
  let best: Snapshot | undefined;
  for (const s of snapshots) {
    if (s.source !== source || s.kind === "close") continue;
    const age = now.getTime() - s.at.getTime();
    if (age < 0 || age > limit) continue;
    if (!best || s.at > best.at) best = s;
  }
  if (best) return { homeProb: best.homeProb, at: best.at, closing: false };
  if (!allowClosingLine) return undefined;
  const close = snapshots.find((s) => s.source === source && s.kind === "close");
  return close ? { homeProb: close.homeProb, at: close.at, closing: true } : undefined;
}

function sideProb(homeProb: number, side: Side): number {
  return side === "home" ? homeProb : 1 - homeProb;
}

function pts(p: number): string {
  return (p * 100).toFixed(1);
}

function check(
  c: Condition,
  now: Date,
  lock: Date,
  price: (s: MarketSource) => Seen | undefined,
): { ok: boolean; why: string } {
  switch (c.kind) {
    case "before_lock": {
      const left = lock.getTime() - now.getTime();
      const ok = left > 0 && left <= c.minutes * MINUTE;
      return {
        ok,
        why: ok
          ? `${Math.round(left / MINUTE)} min before tip-off`
          : `not within ${c.minutes} min of tip-off`,
      };
    }
    case "gap": {
      const a = price(c.a);
      const b = price(c.b);
      if (!a || !b) return { ok: false, why: `no fresh ${!a ? c.a : c.b} price` };
      const gap = Math.abs(a.homeProb - b.homeProb) * 100;
      return {
        ok: gap >= c.min_pts,
        why: `${c.a} ${pts(a.homeProb)} vs ${c.b} ${pts(b.homeProb)}: ${gap.toFixed(1)} pts apart`,
      };
    }
    case "price": {
      const s = price(c.source);
      if (!s) return { ok: false, why: `no fresh ${c.source} price` };
      const fav: Side = s.homeProb >= 0.5 ? "home" : "away";
      const side: Side =
        c.side === "favourite"
          ? fav
          : c.side === "underdog"
            ? fav === "home"
              ? "away"
              : "home"
            : c.side;
      const p = sideProb(s.homeProb, side);
      const ok = c.op === "gte" ? p >= c.value : p <= c.value;
      return { ok, why: `${c.source} ${c.side} at ${pts(p)}` };
    }
    case "move":
      return { ok: false, why: "a BTC condition on a sports rule" };
    default: {
      const never: never = c;
      return never;
    }
  }
}

export function evaluateSports(
  rule: SportsRule,
  now: Date,
  lock: Date,
  snapshots: Snapshot[],
  allowClosingLine = false,
): Verdict<SportsPick> {
  const seen: Partial<Record<MarketSource, Seen>> = {};
  const price = (s: MarketSource) => {
    if (!(s in seen)) {
      const p = freshPrice(snapshots, s, now, lock, allowClosingLine);
      if (p) seen[s] = p;
    }
    return seen[s];
  };
  const why: string[] = [];
  for (const c of rule.when.all) {
    const r = check(c, now, lock, price);
    why.push(r.why);
    if (!r.ok) return { fired: false, why };
  }
  const pick = rule.then[0];
  let side: Side;
  if ("team" in pick.side) side = pick.side.team;
  else {
    const src = "favourite_of" in pick.side ? pick.side.favourite_of : pick.side.underdog_of;
    const p = price(src);
    if (!p) return { fired: false, why: [...why, `no fresh ${src} price to pick a side`] };
    const fav: Side = p.homeProb >= 0.5 ? "home" : "away";
    side = "favourite_of" in pick.side ? fav : fav === "home" ? "away" : "home";
  }
  let confidence: number;
  if ("fixed" in pick.confidence) confidence = pick.confidence.fixed;
  else {
    const p = price(pick.confidence.price_of);
    if (!p) return { fired: false, why: [...why, `no fresh ${pick.confidence.price_of} price`] };
    confidence = sideProb(p.homeProb, side);
  }
  price(rule.against);
  return { fired: true, pick: { side, confidence, seen }, why };
}

export interface BtcPick {
  direction: "up" | "down";
  confidence: number;
  movePct: number;
}

export function evaluateBtc(rule: BtcRule, movePct: number): Verdict<BtcPick> {
  const why: string[] = [];
  for (const c of rule.when.all) {
    const ok =
      c.min_pct > 0 ? movePct >= c.min_pct : c.min_pct < 0 ? movePct <= c.min_pct : movePct !== 0;
    why.push(`BTC ${movePct >= 0 ? "+" : ""}${movePct.toFixed(3)}% over 5 min`);
    if (!ok) return { fired: false, why };
  }
  const pick = rule.then[0];
  const direction =
    pick.side.direction === "same_as_move" ? (movePct > 0 ? "up" : "down") : pick.side.direction;
  return { fired: true, pick: { direction, confidence: pick.confidence.fixed, movePct }, why };
}
