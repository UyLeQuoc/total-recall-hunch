import type { MarketSource } from "../compiler/rule.ts";
import { freshPrice } from "../monitor/evaluate.ts";
import type { PastGame } from "../monitor/replay.ts";
import { brier, mean } from "./brier.ts";

export const CTX = "NBA moneyline";
const PRIOR = 0.25;
const SHRINK_K = 10;
const TREND_WINDOW = 10;
const SOURCES: MarketSource[] = ["books", "polymarket", "kalshi"];

export interface Observation {
  voice: string;
  at: Date;
  p: number;
  y: 0 | 1;
}

export interface VoiceStat {
  voice: string;
  ctx: string;
  n: number;
  brier: number;
  hit: number;
  trend: "up" | "down" | "flat";
}

export function shrunkBrier(stat: { n: number; brier: number }): number {
  return (stat.n * stat.brier + SHRINK_K * PRIOR) / (stat.n + SHRINK_K);
}

export function trustWeight(stat: { n: number; brier: number } | undefined): number {
  if (!stat) return PRIOR * 0.04;
  return Math.max(PRIOR - shrunkBrier(stat), 0.002);
}

export function pricesAtLock(game: PastGame): Partial<Record<MarketSource, number>> {
  const at = new Date(game.startsAt.getTime() - 1000);
  const out: Partial<Record<MarketSource, number>> = {};
  for (const s of SOURCES) {
    const seen = freshPrice(game.snapshots, s, at, game.startsAt, true);
    if (seen) out[s] = seen.homeProb;
  }
  return out;
}

export function sourceObservations(games: PastGame[]): Observation[] {
  const obs: Observation[] = [];
  for (const g of games) {
    const y = g.winner === "home" ? 1 : 0;
    for (const [voice, p] of Object.entries(pricesAtLock(g))) {
      if (p !== undefined) obs.push({ voice, at: g.startsAt, p, y });
    }
  }
  return obs;
}

export function voiceStats(observations: Observation[]): VoiceStat[] {
  const byVoice = new Map<string, Observation[]>();
  for (const o of observations) byVoice.set(o.voice, [...(byVoice.get(o.voice) ?? []), o]);
  const stats: VoiceStat[] = [];
  for (const [voice, list] of byVoice) {
    const sorted = [...list].sort((a, b) => a.at.getTime() - b.at.getTime());
    const scores = sorted.map((o) => brier(o.p, o.y === 1));
    const all = mean(scores) ?? PRIOR;
    const recent = mean(scores.slice(-TREND_WINDOW)) ?? all;
    const trend =
      sorted.length < TREND_WINDOW + 5
        ? "flat"
        : recent < all - 0.01
          ? "up"
          : recent > all + 0.01
            ? "down"
            : "flat";
    const hits = sorted.filter((o) => (o.p >= 0.5 ? o.y === 1 : o.y === 0)).length;
    stats.push({ voice, ctx: CTX, n: sorted.length, brier: all, hit: hits / sorted.length, trend });
  }
  return stats.sort((a, b) => a.voice.localeCompare(b.voice));
}

export interface TrustCitation {
  voice: string;
  n: number;
  brier: number;
  memoryId: string;
  blobId: string | null;
}

export interface AgentCall {
  homeProb: number;
  plainProb: number;
  weights: { source: MarketSource; weight: number }[];
  lines: { text: string; cites: TrustCitation | null }[];
}

const NAME: Record<string, string> = {
  books: "the books",
  polymarket: "Polymarket",
  kalshi: "Kalshi",
};

export function agentCall(
  prices: Partial<Record<MarketSource, number>>,
  trust: Map<string, TrustCitation>,
): AgentCall | null {
  const present = SOURCES.filter((s) => prices[s] !== undefined);
  if (present.length === 0) return null;
  const raw = present.map((s) => ({ source: s, w: trustWeight(trust.get(s)) }));
  const total = raw.reduce((a, b) => a + b.w, 0);
  const weights = raw.map((r) => ({ source: r.source, weight: r.w / total }));
  const homeProb = weights.reduce((acc, w) => acc + w.weight * (prices[w.source] ?? 0), 0);
  const plainProb = present.reduce((acc, s) => acc + (prices[s] ?? 0), 0) / present.length;
  const cited = present.map((s) => trust.get(s)).filter((c): c is TrustCitation => c !== undefined);
  if (cited.length === 0) {
    return {
      homeProb,
      plainProb,
      weights,
      lines: [{ text: "No trust memory yet: every source counts the same.", cites: null }],
    };
  }
  const ranked = [...cited].sort((a, b) => shrunkBrier(a) - shrunkBrier(b));
  const best = ranked[0];
  const worst = ranked.at(-1);
  const lines: AgentCall["lines"] = [];
  if (best) {
    lines.push({
      text: `Leaning on ${NAME[best.voice] ?? best.voice} for ${CTX}s (n=${best.n}, Brier ${best.brier.toFixed(3)})`,
      cites: best,
    });
  }
  if (worst && worst !== best) {
    lines.push({
      text: `away from ${NAME[worst.voice] ?? worst.voice} (n=${worst.n}, Brier ${worst.brier.toFixed(3)})`,
      cites: worst,
    });
  }
  return { homeProb, plainProb, weights, lines };
}

export interface LearningPoint {
  at: string;
  n: number;
  call: number;
  plain: number;
  books: number | null;
}

export function learningCurve(games: PastGame[]): LearningPoint[] {
  const sorted = [...games].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const history: Observation[] = [];
  const scores = { call: [] as number[], plain: [] as number[], books: [] as number[] };
  const points: LearningPoint[] = [];
  for (const g of sorted) {
    const prices = pricesAtLock(g);
    const present = SOURCES.filter((s) => prices[s] !== undefined);
    const y = g.winner === "home" ? 1 : 0;
    if (present.length >= 2) {
      const stats = new Map(
        voiceStats(history).map((s) => [
          s.voice,
          { voice: s.voice, n: s.n, brier: s.brier, memoryId: "", blobId: null },
        ]),
      );
      const call = agentCall(prices, stats);
      if (call) {
        scores.call.push(brier(call.homeProb, y === 1));
        scores.plain.push(brier(call.plainProb, y === 1));
        if (prices.books !== undefined) scores.books.push(brier(prices.books, y === 1));
        points.push({
          at: g.startsAt.toISOString(),
          n: scores.call.length,
          call: mean(scores.call) ?? PRIOR,
          plain: mean(scores.plain) ?? PRIOR,
          books: mean(scores.books),
        });
      }
    }
    for (const s of present) {
      const p = prices[s];
      if (p !== undefined) history.push({ voice: s, at: g.startsAt, p, y });
    }
  }
  return points;
}

export function trustLine(stat: VoiceStat, asOf: string): string {
  return `TRUST · voice=${stat.voice} · ctx=${stat.ctx} · n=${stat.n} · brier=${stat.brier.toFixed(3)} · hit=${stat.hit.toFixed(2)} · trend=${stat.trend} · as_of=${asOf}`;
}

export function parseTrustLine(text: string): (VoiceStat & { asOf: string }) | undefined {
  const fields = new Map(
    text
      .split(" · ")
      .slice(1)
      .map((f) => [f.slice(0, f.indexOf("=")), f.slice(f.indexOf("=") + 1)] as const),
  );
  if (!text.startsWith("TRUST · ")) return undefined;
  const n = Number(fields.get("n"));
  const b = Number(fields.get("brier"));
  const hit = Number(fields.get("hit"));
  const voice = fields.get("voice");
  const ctx = fields.get("ctx");
  const asOf = fields.get("as_of");
  const trend = fields.get("trend");
  if (!voice || !ctx || !asOf || !Number.isFinite(n) || !Number.isFinite(b)) return undefined;
  return {
    voice,
    ctx,
    n,
    brier: b,
    hit: Number.isFinite(hit) ? hit : 0,
    trend: trend === "up" || trend === "down" ? trend : "flat",
    asOf,
  };
}
