import type { Db } from "../db/client.ts";
import { rememberProven } from "../memory/lines.ts";
import { loadRuleRecord, PROVEN_N } from "./record.ts";

export async function rememberNewlyProven(db: Db, now = new Date()): Promise<number> {
  const candidates = await db<{ rule_id: string; owner: string }[]>`
    select p.rule_id, r.owner from picks p join rules r on r.id = p.rule_id
    where p.stage = 'on_record' and p.outcome is not null and p.retracted_at is null and r.owner like 'sui:%'
    group by p.rule_id, r.owner having count(*) >= ${PROVEN_N}`;
  let proven = 0;
  for (const c of candidates) {
    const record = await loadRuleRecord(db, c.rule_id);
    for (const v of record.versions) {
      const s = v.onRecord;
      if (!s.proven || s.brier === null || s.against.brier === null) continue;
      await rememberProven(
        db,
        c.owner.slice(4),
        c.rule_id,
        v.version,
        v.card.title,
        s.n,
        s.brier,
        s.against.name,
        s.against.brier,
        now.toISOString().slice(0, 10),
      );
      proven++;
    }
  }
  return proven;
}
