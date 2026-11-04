import { type Agent, signedBy } from "../anchor/keys.ts";
import { hashPayload, type PickPayload, type RetractPayload } from "../anchor/payload.ts";
import { activeDelegation } from "../auth/service.ts";
import { newId } from "../compiler/store.ts";
import type { Db } from "../db/client.ts";

export interface SignedPickInput {
  address: string;
  market: "nba-ml" | "senate-winner";
  ruleId: string | null;
  version: number | null;
  eventId: string;
  side: "home" | "away";
  team: string;
  confidence: number;
  seen: PickPayload["seen"];
  lock: Date;
  why: string;
  limitPerDay: number | null;
}

export type SignedResult =
  | { ok: true; pickId: string }
  | { ok: false; status: 403 | 409 | 429; reason: string };

function utcDayStart(now: Date): Date {
  return new Date(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
}

export async function createSignedPick(
  db: Db,
  agent: Agent,
  input: SignedPickInput,
  now = new Date(),
): Promise<SignedResult> {
  if (now >= input.lock) {
    return { ok: false, status: 409, reason: "That game has locked. Picks close at tip-off." };
  }
  const delegation = await activeDelegation(db, input.address, now);
  if (!delegation || delegation.agent !== agent.address) {
    return {
      ok: false,
      status: 403,
      reason: "Sign the delegation first: picks on record need it.",
    };
  }
  const today = utcDayStart(now);
  return db.begin(async (tx): Promise<SignedResult> => {
    await tx`select pg_advisory_xact_lock(hashtextextended(${`picks:${input.address}`}, 0))`;
    const counts = await tx<{ owner_today: number; rule_today: number; same: number }[]>`
      select
        count(*) filter (where address = ${input.address} and picked_at >= ${today})::int as owner_today,
        count(*) filter (where rule_id is not distinct from ${input.ruleId}
                           and version is not distinct from ${input.version}
                           and picked_at >= ${today})::int as rule_today,
        count(*) filter (where event_id = ${input.eventId}
                           and (case when ${input.ruleId}::text is null
                                     then rule_id is null and address = ${input.address} and retracted_at is null
                                     else rule_id = ${input.ruleId} and version = ${input.version} end))::int as same
      from picks where stage = 'on_record'`;
    const c = counts[0];
    if (c && c.same > 0)
      return { ok: false, status: 409, reason: "There's already a pick on this game." };
    if (c && c.owner_today >= delegation.perDay) {
      return {
        ok: false,
        status: 429,
        reason: `Your delegation allows ${delegation.perDay} picks a day.`,
      };
    }
    if (c && input.limitPerDay !== null && c.rule_today >= input.limitPerDay) {
      return {
        ok: false,
        status: 429,
        reason: `This rule allows ${input.limitPerDay} picks a day.`,
      };
    }
    const pickId = newId("p");
    const payload: PickPayload = {
      v: 1,
      kind: "pick",
      pick: pickId,
      rule: input.ruleId,
      version: input.version,
      event: input.eventId,
      market: input.market,
      side: input.side,
      team: input.team,
      confidence: Math.round(input.confidence * 10_000) / 10_000,
      seen: input.seen,
      at: now.toISOString(),
      lock: input.lock.toISOString(),
      owner: input.address,
      delegation: delegation.id,
      agent: agent.address,
    };
    const hash = hashPayload(payload);
    const signature = await agent.sign(hash);
    await tx`
      insert into picks (id, owner, rule_id, version, stage, market, side, confidence, why, inputs,
                         picked_at, expires_at, event_id, address, delegation_id, payload, hash, signature, agent)
      values (${pickId}, ${`sui:${input.address}`}, ${input.ruleId}, ${input.version}, 'on_record', ${input.market},
              ${input.side}, ${payload.confidence}, ${input.why}, ${tx.json(input.seen)}, ${now}, ${input.lock},
              ${input.eventId}, ${input.address}, ${delegation.id}, ${tx.json(payload)}, ${hash}, ${signature},
              ${agent.address})`;
    await tx`insert into notifications (address, pick_id, text)
             values (${input.address}, ${pickId}, ${`Picked ${input.team} ${Math.round(input.confidence * 100)}% · ${input.why}`})`;
    return { ok: true, pickId };
  });
}

export async function retractPick(
  db: Db,
  agent: Agent,
  pickId: string,
  address: string,
  now = new Date(),
): Promise<SignedResult> {
  const rows = await db<
    {
      hash: string | null;
      expires_at: Date;
      retracted_at: Date | null;
      delegation_id: string | null;
    }[]
  >`select hash, expires_at, retracted_at, delegation_id from picks
    where id = ${pickId} and address = ${address} and stage = 'on_record'`;
  const pick = rows[0];
  if (!pick?.hash || !pick.delegation_id)
    return { ok: false, status: 403, reason: "That isn't your pick on record." };
  if (pick.retracted_at) return { ok: false, status: 409, reason: "It's already undone." };
  if (now >= pick.expires_at) {
    return {
      ok: false,
      status: 409,
      reason: "Too late: the game locked. The pick stays on the record.",
    };
  }
  const payload: RetractPayload = {
    v: 1,
    kind: "retract",
    pick: pickId,
    pickHash: pick.hash,
    at: now.toISOString(),
    owner: address,
    delegation: pick.delegation_id,
    agent: agent.address,
  };
  const hash = hashPayload(payload);
  const signature = await agent.sign(hash);
  if ((await signedBy(hash, signature)) !== agent.address)
    throw new Error("the agent's signature didn't verify");
  const updated = await db`
    update picks set retracted_at = ${now}, retraction = ${db.json({ payload, hash, signature })}
    where id = ${pickId} and retracted_at is null returning id`;
  if (updated.length === 0) return { ok: false, status: 409, reason: "It's already undone." };
  return { ok: true, pickId };
}
