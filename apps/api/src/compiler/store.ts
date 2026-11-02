import type { Db } from "../db/client.ts";
import { type Rule, rule as ruleSchema } from "./rule.ts";

export function newId(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `${prefix}_${[...bytes].map((b) => b.toString(36).padStart(2, "0")).join("")}`;
}

export interface StoredRule {
  id: string;
  hunch: string;
  version: number;
  compiledBy: string;
  rule: Rule;
}

export async function saveRule(
  db: Db,
  owner: string,
  hunch: string,
  rule: Rule,
  compiledBy: string,
): Promise<StoredRule> {
  const id = newId("r");
  await db.begin(async (tx) => {
    await tx`insert into rules (id, owner, hunch) values (${id}, ${owner}, ${hunch})`;
    await tx`insert into rule_versions (rule_id, version, rule, compiled_by)
             values (${id}, ${rule.version}, ${tx.json(JSON.parse(JSON.stringify(rule)))}, ${compiledBy})`;
  });
  return { id, hunch, version: rule.version, compiledBy, rule };
}

export async function loadRule(db: Db, id: string): Promise<StoredRule | undefined> {
  const rows = await db<
    { hunch: string; version: number; rule: unknown; compiled_by: string; stage: string }[]
  >`
    select r.hunch, v.version, v.rule, v.compiled_by, v.stage
    from rules r join rule_versions v on v.rule_id = r.id
    where r.id = ${id} order by v.version desc limit 1`;
  const row = rows[0];
  if (!row) return undefined;
  const parsed = ruleSchema.safeParse(row.rule);
  if (!parsed.success) return undefined;
  return {
    id,
    hunch: row.hunch,
    version: row.version,
    compiledBy: row.compiled_by,
    rule: { ...parsed.data, stage: row.stage === "on_record" ? "on_record" : "practice" },
  };
}
