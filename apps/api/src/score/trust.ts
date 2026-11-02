import type { Logger } from "@hunch/chain";
import { NAMESPACE } from "@hunch/memory";
import type { Db } from "../db/client.ts";
import { newestLines, queueMemory } from "../memory/queue.ts";
import { type Operator, recallLines } from "../memory/walrus.ts";
import { loadPastGames } from "../monitor/history.ts";
import {
  type Observation,
  parseTrustLine,
  pricesAtLock,
  sourceObservations,
  type TrustCitation,
  trustLine,
  voiceStats,
} from "./voices.ts";

const HISTORY_DAYS = 30;
const SPLIT_PTS = 3;
const RECALL_CACHE_MS = 60_000;

async function pickObservations(db: Db): Promise<Observation[]> {
  const rows = await db<
    {
      rule_id: string | null;
      version: number | null;
      address: string | null;
      confidence: number;
      outcome: number;
      picked_at: Date;
    }[]
  >`select rule_id, version, address, confidence, outcome, picked_at from picks
    where market = 'nba-ml' and stage = 'on_record' and outcome is not null and retracted_at is null`;
  return rows.map((r) => ({
    voice: r.rule_id ? `rule:${r.rule_id}@v${r.version ?? 1}` : `person:${r.address ?? "unknown"}`,
    at: r.picked_at,
    p: r.confidence,
    y: r.outcome === 1 ? 1 : 0,
  }));
}

export async function writeTrustSnapshots(db: Db, log: Logger, now = new Date()): Promise<number> {
  const games = await loadPastGames(db, new Date(now.getTime() - HISTORY_DAYS * 86_400_000), now);
  const stats = voiceStats([...sourceObservations(games), ...(await pickObservations(db))]);
  const asOf = now.toISOString().slice(0, 10);
  for (const stat of stats) {
    await queueMemory(
      db,
      NAMESPACE.trust,
      trustLine(stat, asOf),
      `trust:${stat.voice}:${stat.ctx}:${stat.n}`,
    );
  }
  const splits = new Map<string, { right: number; n: number }>();
  for (const g of games) {
    const prices = pricesAtLock(g);
    const y = g.winner === "home" ? 1 : 0;
    const entries = Object.entries(prices).filter((e): e is [string, number] => e[1] !== undefined);
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i];
        const b = entries[j];
        if (!a || !b || Math.abs(a[1] - b[1]) * 100 < SPLIT_PTS) continue;
        const aCloser = Math.abs(a[1] - y) < Math.abs(b[1] - y);
        const key = `${a[0]}|${b[0]}`;
        const s = splits.get(key) ?? { right: 0, n: 0 };
        splits.set(key, { right: s.right + (aCloser ? 1 : 0), n: s.n + 1 });
      }
    }
  }
  for (const [key, s] of splits) {
    const [a, b] = key.split("|");
    const winner = s.right * 2 >= s.n ? a : b;
    await queueMemory(
      db,
      NAMESPACE.radar,
      `SPLIT · NBA ML · ${a} vs ${b} · ≥${SPLIT_PTS} pts at lock · ${a} closer ${s.right} of ${s.n} · lean=${winner} · as_of=${asOf}`,
      `split:${key}:${s.n}`,
    );
  }
  log.debug("trust snapshots queued", { voices: stats.length, splits: splits.size });
  return stats.length;
}

let recalled: { at: number; lines: { text: string; blobId: string }[] } | undefined;

export async function currentTrust(
  db: Db,
  op: Operator | undefined,
  log: Logger,
): Promise<Map<string, TrustCitation>> {
  const local = await newestLines(db, NAMESPACE.trust, "TRUST · ");
  const byText = new Map(local.map((l) => [l.text, l]));
  let source = local.map((l) => ({ text: l.text, blobId: l.blobId }));
  if (op) {
    try {
      if (!recalled || Date.now() - recalled.at > RECALL_CACHE_MS) {
        recalled = {
          at: Date.now(),
          lines: await recallLines(op, NAMESPACE.trust, "TRUST voice NBA moneyline n brier"),
        };
      }
      if (recalled.lines.length > 0) source = recalled.lines;
    } catch (err) {
      log.warn("trust recall failed, using Postgres copies", { reason: String(err) });
    }
  }
  const newest = new Map<string, TrustCitation & { asOf: string }>();
  for (const line of source) {
    const parsed = parseTrustLine(line.text);
    if (!parsed) continue;
    const prev = newest.get(parsed.voice);
    if (prev && (prev.asOf > parsed.asOf || (prev.asOf === parsed.asOf && prev.n >= parsed.n)))
      continue;
    newest.set(parsed.voice, {
      voice: parsed.voice,
      n: parsed.n,
      brier: parsed.brier,
      memoryId: byText.get(line.text)?.id ?? "",
      blobId: line.blobId ?? byText.get(line.text)?.blobId ?? null,
      asOf: parsed.asOf,
    });
  }
  return new Map([...newest].map(([k, v]) => [k, v]));
}
