import type { Logger } from "@hunch/chain";
import type { Agent } from "../anchor/keys.ts";
import type { PickPayload } from "../anchor/payload.ts";
import {
  isBtcRule,
  type MarketSource,
  rule as ruleSchema,
  type SportsRule,
} from "../compiler/rule.ts";
import { newId } from "../compiler/store.ts";
import type { Db } from "../db/client.ts";
import { evaluateSports, type Snapshot } from "./evaluate.ts";
import { createSignedPick } from "./signed.ts";

const LOOKAHEAD_MS = 24 * 3_600_000;

interface ActiveRule {
  id: string;
  version: number;
  owner: string;
  stage: "practice" | "on_record";
  rule: SportsRule;
}

interface UpcomingEvent {
  id: string;
  home: string;
  away: string;
  starts_at: Date;
}

async function activeRules(db: Db): Promise<ActiveRule[]> {
  const rows = await db<
    { id: string; version: number; owner: string; stage: string; rule: unknown }[]
  >`
    select distinct on (r.id) r.id, v.version, r.owner, v.stage, v.rule
    from rules r join rule_versions v on v.rule_id = r.id
    where r.paused = false and (v.stage = 'on_record' or r.owner like 'sui:%')
    order by r.id, v.version desc`;
  const out: ActiveRule[] = [];
  for (const row of rows) {
    const parsed = ruleSchema.safeParse(row.rule);
    if (!parsed.success || isBtcRule(parsed.data)) continue;
    out.push({
      id: row.id,
      version: row.version,
      owner: row.owner,
      stage: row.stage === "on_record" ? "on_record" : "practice",
      rule: parsed.data,
    });
  }
  return out;
}

function seenPayload(
  seen: Partial<Record<MarketSource, { homeProb: number; at: Date }>>,
): PickPayload["seen"] {
  const out: PickPayload["seen"] = {};
  for (const [source, s] of Object.entries(seen)) {
    if (s) out[source] = { p: Math.round(s.homeProb * 10_000) / 10_000, at: s.at.toISOString() };
  }
  return out;
}

async function logFire(
  db: Db,
  r: ActiveRule,
  eventId: string,
  now: Date,
  fired: boolean,
  why: string[],
  pickId: string | null,
): Promise<void> {
  const last = await db<{ why: string[]; fired: boolean }[]>`
    select why, fired from fires where rule_id = ${r.id} and version = ${r.version} and event_id = ${eventId}
    order by at desc limit 1`;
  const prev = last[0];
  if (!fired && prev && !prev.fired && JSON.stringify(prev.why) === JSON.stringify(why)) return;
  await db`insert into fires (rule_id, version, event_id, at, fired, why, pick_id)
           values (${r.id}, ${r.version}, ${eventId}, ${now}, ${fired}, ${db.json(why)}, ${pickId})`;
}

export async function runRecordMonitor(
  db: Db,
  agent: Agent | undefined,
  log: Logger,
  now = new Date(),
): Promise<void> {
  const rules = await activeRules(db);
  if (rules.length === 0) return;
  const events = await db<UpcomingEvent[]>`
    select id, home, away, starts_at from events
    where league = 'NBA' and status = 'pre' and starts_at > ${now}
      and starts_at <= ${new Date(now.getTime() + LOOKAHEAD_MS)}`;
  if (events.length === 0) return;
  const snaps = await db<{ event_id: string; source: MarketSource; home_prob: number; at: Date }[]>`
    select event_id, source, home_prob, at from snapshots
    where kind = 'live' and event_id in ${db(events.map((e) => e.id))}
      and at > ${new Date(now.getTime() - 2 * 3_600_000)}`;
  let picked = 0;
  for (const event of events) {
    const snapshots: Snapshot[] = snaps
      .filter((s) => s.event_id === event.id)
      .map((s) => ({ source: s.source, homeProb: s.home_prob, at: s.at, kind: "live" }));
    for (const r of rules) {
      const already = await db<{ id: string }[]>`
        select id from picks where rule_id = ${r.id} and version = ${r.version} and event_id = ${event.id}
          and retracted_at is null limit 1`;
      if (already[0]) continue;
      const verdict = evaluateSports(r.rule, now, event.starts_at, snapshots);
      if (!verdict.fired) {
        await logFire(db, r, event.id, now, false, verdict.why, null);
        continue;
      }
      const team = verdict.pick.side === "home" ? event.home : event.away;
      const why = verdict.why.join(" · ");
      if (r.stage === "on_record") {
        if (!agent) {
          await logFire(
            db,
            r,
            event.id,
            now,
            false,
            [...verdict.why, "no agent key: can't sign"],
            null,
          );
          continue;
        }
        const result = await createSignedPick(
          db,
          agent,
          {
            address: r.owner.slice(4),
            ruleId: r.id,
            version: r.version,
            eventId: event.id,
            side: verdict.pick.side,
            team,
            confidence: verdict.pick.confidence,
            seen: seenPayload(verdict.pick.seen),
            lock: event.starts_at,
            why,
            limitPerDay: r.rule.limits.picks_per_day,
          },
          now,
        );
        await logFire(
          db,
          r,
          event.id,
          now,
          result.ok,
          result.ok ? verdict.why : [...verdict.why, result.reason],
          result.ok ? result.pickId : null,
        );
        if (result.ok) picked++;
        continue;
      }
      const pickId = newId("p");
      await db`
        insert into picks (id, owner, rule_id, version, stage, market, side, confidence, why, inputs,
                           picked_at, expires_at, event_id, address)
        values (${pickId}, ${r.owner}, ${r.id}, ${r.version}, 'practice', 'nba-ml', ${verdict.pick.side},
                ${verdict.pick.confidence}, ${why}, ${db.json(seenPayload(verdict.pick.seen))}, ${now},
                ${event.starts_at}, ${event.id}, ${r.owner.slice(4)})`;
      await logFire(db, r, event.id, now, true, verdict.why, pickId);
      picked++;
    }
  }
  if (picked > 0) log.info("rules fired", { picked });
}
