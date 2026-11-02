import type { Json } from "../anchor/payload.ts";
import { ruleCard } from "../compiler/card.ts";
import { type MarketSource, rule as ruleSchema } from "../compiler/rule.ts";
import type { Db } from "../db/client.ts";
import { brier, mean } from "./brier.ts";

export const PROVEN_N = 20;

export interface ResolvedPick {
  side: string;
  confidence: number;
  outcome: number;
  seen: { [source: string]: { p: number } };
}

export interface VersionScore {
  n: number;
  right: number;
  brier: number | null;
  against: { name: string; brier: number | null; compared: number };
  proven: boolean;
}

export function scoreVersion(picks: ResolvedPick[], against: string): VersionScore {
  const rule: number[] = [];
  const ruleSame: number[] = [];
  const market: number[] = [];
  let right = 0;
  for (const p of picks) {
    const ok = p.outcome === 1;
    if (ok) right++;
    rule.push(brier(p.confidence, ok));
    const a = p.seen[against];
    if (a) {
      const sideProb = p.side === "home" ? a.p : 1 - a.p;
      market.push(brier(sideProb, ok));
      ruleSame.push(brier(p.confidence, ok));
    }
  }
  const ruleOnSame = mean(ruleSame);
  const marketBrier = mean(market);
  const proven =
    picks.length >= PROVEN_N &&
    ruleOnSame !== null &&
    marketBrier !== null &&
    ruleOnSame < marketBrier;
  return {
    n: picks.length,
    right,
    brier: mean(rule),
    against: { name: against, brier: marketBrier, compared: market.length },
    proven,
  };
}

export interface RulePick {
  id: string;
  version: number | null;
  stage: string;
  eventId: string | null;
  label: string;
  side: string;
  confidence: number;
  pickedAt: string;
  lock: string;
  outcome: "pending" | "right" | "wrong";
  retracted: boolean;
  anchored: boolean;
}

export interface VersionRecord {
  version: number;
  stage: string;
  hunch: string | null;
  onRecordAt: string | null;
  card: ReturnType<typeof ruleCard>;
  onRecord: VersionScore;
  practice: VersionScore;
  retracted: number;
  open: number;
}

function seenOf(inputs: unknown): ResolvedPick["seen"] {
  if (!inputs || typeof inputs !== "object") return {};
  const out: ResolvedPick["seen"] = {};
  for (const [k, v] of Object.entries(inputs)) {
    if (v && typeof v === "object" && "p" in v && typeof v.p === "number") out[k] = { p: v.p };
  }
  return out;
}

export async function loadRuleRecord(db: Db, ruleId: string) {
  const versions = await db<
    {
      version: number;
      stage: string;
      hunch: string | null;
      on_record_at: Date | null;
      rule: unknown;
    }[]
  >`select version, stage, hunch, on_record_at, rule from rule_versions where rule_id = ${ruleId} order by version desc`;
  const picks = await db<
    {
      id: string;
      version: number | null;
      stage: string;
      event_id: string | null;
      side: string;
      confidence: number;
      inputs: Json;
      picked_at: Date;
      expires_at: Date;
      outcome: number | null;
      retracted_at: Date | null;
      home: string | null;
      away: string | null;
      title: string | null;
      anchored: boolean;
    }[]
  >`select p.id, p.version, p.stage, p.event_id, p.side, p.confidence, p.inputs, p.picked_at, p.expires_at,
           p.outcome, p.retracted_at, e.home, e.away, coalesce(e.title, e.away || ' @ ' || e.home) as title,
           exists (select 1 from anchor_leaves l join anchors a on a.id = l.anchor_id
                   where l.pick_id = p.id and a.status = 'anchored') as anchored
    from picks p left join events e on e.id = p.event_id
    where p.rule_id = ${ruleId} order by p.picked_at desc limit 200`;
  const fires = await db<
    { version: number; event_id: string; at: Date; fired: boolean; why: string[] }[]
  >`
    select version, event_id, at, fired, why from fires where rule_id = ${ruleId} order by at desc limit 40`;
  const records: VersionRecord[] = [];
  for (const v of versions) {
    const parsed = ruleSchema.safeParse(v.rule);
    if (!parsed.success) continue;
    const against: MarketSource | "predict" = parsed.data.against;
    const mine = picks.filter((p) => p.version === v.version);
    const resolved = (stage: string) =>
      mine
        .filter((p) => p.stage === stage && p.outcome !== null && !p.retracted_at)
        .map((p) => ({
          side: p.side,
          confidence: p.confidence,
          outcome: p.outcome ?? 0,
          seen: seenOf(p.inputs),
        }));
    records.push({
      version: v.version,
      stage: v.stage,
      hunch: v.hunch,
      onRecordAt: v.on_record_at?.toISOString() ?? null,
      card: ruleCard({ ...parsed.data, stage: v.stage === "on_record" ? "on_record" : "practice" }),
      onRecord: scoreVersion(resolved("on_record"), against),
      practice: scoreVersion(resolved("practice"), against),
      retracted: mine.filter((p) => p.retracted_at).length,
      open: mine.filter((p) => p.outcome === null && !p.retracted_at).length,
    });
  }
  const pickList: RulePick[] = picks.map((p) => ({
    id: p.id,
    version: p.version,
    stage: p.stage,
    eventId: p.event_id,
    label: p.title ?? "BTC 5 min",
    side: p.home && p.away ? (p.side === "home" ? p.home : p.away) : p.side,
    confidence: p.confidence,
    pickedAt: p.picked_at.toISOString(),
    lock: p.expires_at.toISOString(),
    outcome: p.outcome === null ? "pending" : p.outcome === 1 ? "right" : "wrong",
    retracted: p.retracted_at !== null,
    anchored: p.anchored,
  }));
  return {
    versions: records,
    picks: pickList,
    fires: fires.map((f) => ({
      version: f.version,
      eventId: f.event_id,
      at: f.at.toISOString(),
      fired: f.fired,
      why: f.why,
    })),
  };
}
