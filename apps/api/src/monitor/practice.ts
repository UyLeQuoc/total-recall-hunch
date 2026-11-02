import type { Logger } from "@hunch/chain";
import { practiceMomentumRule } from "../compiler/patterns.ts";
import { type BtcRule, isBtcRule } from "../compiler/rule.ts";
import { loadRule, newId, saveRule } from "../compiler/store.ts";
import type { Db } from "../db/client.ts";
import { currentTick, recentMinutes, storedFiveMinute } from "../ingest/btc.ts";
import type { Candle, Tick } from "../ingest/coinbase.ts";
import { brier } from "../score/brier.ts";
import { evaluateBtc } from "./evaluate.ts";
import { REPLAY_DAYS, replayBtc } from "./replay.ts";

const MINUTE = 60_000;
const HORIZON_MS = 5 * MINUTE;
const PRACTICE_OWNER = "hunch:practice";

export interface PickView {
  id: string;
  ruleId: string | null;
  market: string;
  side: string;
  confidence: number;
  why: string;
  pickedAt: string;
  expiresAt: string;
  entryPrice: number | null;
  exitPrice: number | null;
  exitAt: string | null;
  outcome: "pending" | "right" | "wrong";
  brier: number | null;
}

interface PickRow {
  id: string;
  rule_id: string | null;
  market: string;
  side: string;
  confidence: number;
  why: string;
  picked_at: Date;
  expires_at: Date;
  entry_price: number | null;
  exit_price: number | null;
  exit_at: Date | null;
  outcome: number | null;
  brier: number | null;
}

function view(r: PickRow): PickView {
  return {
    id: r.id,
    ruleId: r.rule_id,
    market: r.market,
    side: r.side,
    confidence: r.confidence,
    why: r.why,
    pickedAt: r.picked_at.toISOString(),
    expiresAt: r.expires_at.toISOString(),
    entryPrice: r.entry_price,
    exitPrice: r.exit_price,
    exitAt: r.exit_at?.toISOString() ?? null,
    outcome: r.outcome === null ? "pending" : r.outcome === 1 ? "right" : "wrong",
    brier: r.brier,
  };
}

export function fiveMinuteMove(minutes: Candle[], tick: Tick): number | undefined {
  const start = Math.floor(tick.at.getTime() / MINUTE) * MINUTE - HORIZON_MS;
  const ref =
    minutes.find((c) => c.startAt.getTime() === start) ??
    [...minutes].reverse().find((c) => c.startAt.getTime() <= start);
  if (!ref) return undefined;
  return ((tick.price - ref.open) / ref.open) * 100;
}

async function practiceRule(
  db: Db,
  ruleId: string | undefined,
  now: Date,
): Promise<{ id: string; rule: BtcRule }> {
  if (ruleId) {
    const stored = await loadRule(db, ruleId);
    if (stored && isBtcRule(stored.rule)) return { id: stored.id, rule: stored.rule };
  }
  const base = practiceMomentumRule(now);
  const history = await storedFiveMinute(db, new Date(now.getTime() - REPLAY_DAYS * 86_400_000));
  const replay = replayBtc(base, history, now);
  const rate = replay.fires > 0 ? Math.round((replay.right / replay.fires) * 100) / 100 : 0.5;
  const rule: BtcRule = {
    ...base,
    then: [{ ...base.then[0], confidence: { fixed: Math.min(Math.max(rate, 0.05), 0.95) } }],
  };
  const stored = await saveRule(
    db,
    PRACTICE_OWNER,
    "BTC keeps its last 5-minute direction for the next 5.",
    rule,
    "pattern",
  );
  return { id: stored.id, rule };
}

export type PracticeResult =
  | { ok: true; pick: PickView; ruleId: string; rule: BtcRule }
  | { ok: false; reason: string };

export async function startPractice(
  db: Db,
  owner: string,
  ruleId: string | undefined,
): Promise<PracticeResult> {
  const tick = await currentTick();
  const move = fiveMinuteMove(await recentMinutes(), tick);
  if (move === undefined)
    return { ok: false, reason: "BTC's last 5 minutes aren't in yet. Try again in a minute." };
  const now = new Date();
  let { id, rule } = await practiceRule(db, ruleId, now);
  let verdict = evaluateBtc(rule, move);
  if (!verdict.fired) {
    ({ id, rule } = await practiceRule(db, undefined, now));
    verdict = evaluateBtc(rule, move);
  }
  if (!verdict.fired)
    return { ok: false, reason: "BTC hasn't moved in 5 minutes. Try again shortly." };
  const pickId = newId("p");
  const expires = new Date(tick.at.getTime() + HORIZON_MS);
  const why = `${verdict.why.join(" · ")} → ${verdict.pick.direction}`;
  const rows = await db<PickRow[]>`
    insert into picks (id, owner, rule_id, version, stage, market, side, confidence, why, inputs, picked_at, expires_at, entry_price)
    values (${pickId}, ${owner}, ${id}, ${rule.version}, 'practice', 'btc-5m', ${verdict.pick.direction},
            ${verdict.pick.confidence}, ${why}, ${db.json({ price: tick.price, at: tick.at.toISOString(), movePct: move })},
            ${tick.at}, ${expires}, ${tick.price})
    returning *`;
  const row = rows[0];
  if (!row) throw new Error("the pick wasn't stored");
  return { ok: true, pick: view(row), ruleId: id, rule };
}

export async function loadPick(db: Db, id: string): Promise<PickView | undefined> {
  const rows = await db<PickRow[]>`select * from picks where id = ${id}`;
  return rows[0] ? view(rows[0]) : undefined;
}

export async function resolveDuePicks(db: Db, log: Logger): Promise<number> {
  const due = await db<PickRow[]>`
    select * from picks where outcome is null and market = 'btc-5m' and expires_at <= now()`;
  if (due.length === 0) return 0;
  const tick = await currentTick();
  let resolved = 0;
  for (const p of due) {
    if (tick.at < p.expires_at || p.entry_price === null) continue;
    const up = tick.price > p.entry_price;
    const down = tick.price < p.entry_price;
    const right = p.side === "up" ? up : down;
    await db`
      update picks set exit_price = ${tick.price}, exit_at = ${tick.at}, outcome = ${right ? 1 : 0},
        brier = ${brier(p.confidence, right)}
      where id = ${p.id} and outcome is null`;
    resolved++;
  }
  if (resolved > 0) log.info("practice picks resolved", { resolved });
  return resolved;
}
