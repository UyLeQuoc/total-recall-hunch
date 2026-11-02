import type { Logger } from "@hunch/chain";
import { runAnchorBatch } from "../anchor/batcher.ts";
import { persistUsage } from "../anchor/meter.ts";
import { backfillBtc, refreshBtc } from "../ingest/btc.ts";
import { backfillNba, ingestNba } from "../ingest/nba.ts";
import { ingestSenate } from "../ingest/senate.ts";
import { flushMemories } from "../memory/walrus.ts";
import { rememberNewlyProven } from "../score/proven.ts";
import { resolveSportsPicks } from "../score/resolve.ts";
import { currentTrust, writeTrustSnapshots } from "../score/trust.ts";
import { CONTEXT } from "../score/voices.ts";
import type { Services } from "../services.ts";
import { resolveDuePicks } from "./practice.ts";
import { runRecordMonitor } from "./record.ts";

const SECOND = 1000;

function every(name: string, ms: number, log: Logger, job: () => Promise<unknown>): void {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await job();
    } catch (err) {
      log.warn(`${name} failed`, { reason: String(err) });
    } finally {
      running = false;
    }
  };
  void tick();
  setInterval(() => void tick(), ms);
}

export function startLoops(s: Services): void {
  const { db, log } = s;
  every("resolve-btc", 5 * SECOND, log, () => resolveDuePicks(db, log));
  every("monitor", 60 * SECOND, log, () => runRecordMonitor(db, s.agent, log));
  every("anchor", 60 * SECOND, log, () => runAnchorBatch(db, s.anchor, log));
  every("meter", 60 * SECOND, log, () => persistUsage(db));
  every("memory", 30 * SECOND, log, () => flushMemories(db, s.memory, log));
  if (s.memory) {
    every("trust-recall", 60 * SECOND, log, () =>
      Promise.all([
        currentTrust(db, s.memory, log, CONTEXT.NBA),
        currentTrust(db, s.memory, log, CONTEXT.SENATE),
      ]),
    );
  }
  every("score", 5 * 60 * SECOND, log, async () => {
    await resolveSportsPicks(db);
    await writeTrustSnapshots(db, log);
    await rememberNewlyProven(db);
  });
  if (s.env.INGEST === "off") return;
  every("btc", 60 * SECOND, log, async () => {
    await backfillBtc(db, log);
    await refreshBtc(db);
  });
  every("nba", 5 * 60 * SECOND, log, () =>
    ingestNba(db, log, { apiKey: s.env.ODDS_API_KEY, dailyCalls: s.env.ODDS_API_DAILY_CALLS }),
  );
  every("senate", 5 * 60 * SECOND, log, () => ingestSenate(db, log));
  every("nba-backfill", 60 * 60 * SECOND, log, () => backfillNba(db, log));
}
