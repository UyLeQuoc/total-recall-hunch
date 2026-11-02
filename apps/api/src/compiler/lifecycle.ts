import { activeDelegation } from "../auth/service.ts";
import type { Db } from "../db/client.ts";
import { rememberRuleOnRecord } from "../memory/lines.ts";
import { ruleCard } from "./card.ts";
import { type CompilerConfig, compileHunch } from "./compile.ts";
import { isBtcRule, type Rule, rule as ruleSchema } from "./rule.ts";

export type LifecycleResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: 403 | 404 | 409 | 422; reason: string };

async function latest(
  db: Db,
  ruleId: string,
): Promise<{ owner: string; version: number; stage: string; rule: Rule } | undefined> {
  const rows = await db<{ owner: string; version: number; stage: string; rule: unknown }[]>`
    select r.owner, v.version, v.stage, v.rule from rules r join rule_versions v on v.rule_id = r.id
    where r.id = ${ruleId} order by v.version desc limit 1`;
  const row = rows[0];
  const parsed = ruleSchema.safeParse(row?.rule);
  if (!row || !parsed.success) return undefined;
  return { owner: row.owner, version: row.version, stage: row.stage, rule: parsed.data };
}

export async function ownsRule(db: Db, ruleId: string, owners: string[]): Promise<boolean> {
  const rows = await db<{ owner: string }[]>`select owner from rules where id = ${ruleId}`;
  return rows[0] !== undefined && owners.includes(rows[0].owner);
}

export async function putOnRecord(
  db: Db,
  ruleId: string,
  address: string,
  owners: string[],
  agentAddress: string | undefined,
): Promise<LifecycleResult<{ version: number }>> {
  const current = await latest(db, ruleId);
  if (!current) return { ok: false, status: 404, reason: "No rule has that id." };
  if (!owners.includes(current.owner))
    return { ok: false, status: 403, reason: "Only the rule's owner can put it on record." };
  if (isBtcRule(current.rule)) {
    return {
      ok: false,
      status: 422,
      reason: "BTC rules stay in practice for now; NBA rules go on record.",
    };
  }
  if (!agentAddress)
    return { ok: false, status: 409, reason: "Hunch has no agent key to sign picks with yet." };
  const delegation = await activeDelegation(db, address);
  if (!delegation || delegation.agent !== agentAddress) {
    return { ok: false, status: 403, reason: "Sign the delegation first." };
  }
  if (current.stage === "on_record") return { ok: true, value: { version: current.version } };
  await db`update rules set owner = ${`sui:${address}`}, paused = false where id = ${ruleId}`;
  await db`update rule_versions set stage = 'on_record', on_record_at = now()
           where rule_id = ${ruleId} and version = ${current.version}`;
  await rememberRuleOnRecord(
    db,
    address,
    ruleId,
    current.version,
    ruleCard({ ...current.rule, stage: "on_record" }),
    new Date().toISOString().slice(0, 10),
  );
  return { ok: true, value: { version: current.version } };
}

export async function setPaused(
  db: Db,
  ruleId: string,
  owners: string[],
  paused: boolean,
): Promise<LifecycleResult<{ paused: boolean }>> {
  if (!(await ownsRule(db, ruleId, owners)))
    return { ok: false, status: 403, reason: "That isn't your rule." };
  await db`update rules set paused = ${paused} where id = ${ruleId}`;
  return { ok: true, value: { paused } };
}

export async function pauseAll(db: Db, address: string): Promise<number> {
  const rows = await db<{ id: string }[]>`
    update rules set paused = true where owner = ${`sui:${address}`} and paused = false returning id`;
  return rows.length;
}

export async function addVersion(
  db: Db,
  ruleId: string,
  owners: string[],
  hunch: string,
  config: CompilerConfig,
  onModelError: (reason: string) => void,
): Promise<LifecycleResult<{ version: number; rule: Rule; compiledBy: string }>> {
  const current = await latest(db, ruleId);
  if (!current) return { ok: false, status: 404, reason: "No rule has that id." };
  if (!owners.includes(current.owner))
    return { ok: false, status: 403, reason: "That isn't your rule." };
  const compiled = await compileHunch(hunch, new Date(), config, onModelError);
  if (compiled.kind === "question") return { ok: false, status: 422, reason: compiled.question };
  if (compiled.kind === "refused") return { ok: false, status: 422, reason: compiled.reason };
  const version = current.version + 1;
  const next: Rule = { ...compiled.rule, version, stage: "practice" };
  await db`insert into rule_versions (rule_id, version, rule, compiled_by, stage, hunch)
           values (${ruleId}, ${version}, ${db.json(JSON.parse(JSON.stringify(next)))}, ${compiled.by},
                   'practice', ${hunch})`;
  return { ok: true, value: { version, rule: next, compiledBy: compiled.by } };
}
