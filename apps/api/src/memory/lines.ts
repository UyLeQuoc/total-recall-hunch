import { NAMESPACE } from "@hunch/memory";
import type { RuleCard } from "../compiler/card.ts";
import type { Db } from "../db/client.ts";
import { queueMemory } from "./queue.ts";

async function isTestAccount(db: Db, address: string): Promise<boolean> {
  const rows = await db<{ test: boolean }[]>`
    select test from delegations where address = ${address} order by created_at desc limit 1`;
  return rows[0]?.test ?? false;
}

async function queueFor(
  db: Db,
  address: string,
  namespace: string,
  text: string,
  key: string,
): Promise<void> {
  const test = await isTestAccount(db, address);
  await queueMemory(db, namespace, test ? `(test) ${text}` : text, key, test ? "test" : "pending");
}

export async function rememberRuleOnRecord(
  db: Db,
  address: string,
  ruleId: string,
  version: number,
  card: RuleCard,
  asOf: string,
): Promise<void> {
  await queueFor(
    db,
    address,
    NAMESPACE.rules(address),
    `RULE · v${version} · ${card.title} · ${card.when.join(" · ")} · against ${card.against} · on record · as_of=${asOf}`,
    `rule:${ruleId}:v${version}:on_record`,
  );
}

export async function rememberProven(
  db: Db,
  address: string,
  ruleId: string,
  version: number,
  title: string,
  n: number,
  ruleBrier: number,
  against: string,
  againstBrier: number,
  asOf: string,
): Promise<void> {
  await queueFor(
    db,
    address,
    NAMESPACE.rules(address),
    `PROVEN · rule=${title} v${version} · n=${n} · brier ${ruleBrier.toFixed(3)} vs ${against} ${againstBrier.toFixed(3)} · as_of=${asOf}`,
    `proven:${ruleId}:v${version}:${n}`,
  );
}

export async function rememberAnchoredPicks(
  db: Db,
  anchorId: string,
  digest: string,
): Promise<void> {
  const rows = await db<
    {
      id: string;
      address: string;
      rule_id: string | null;
      version: number | null;
      picked_at: Date;
      team: string;
      confidence: number;
    }[]
  >`select p.id, p.address, p.rule_id, p.version, p.picked_at, p.payload->>'team' as team, p.confidence
    from anchor_leaves l join picks p on p.id = l.pick_id
    where l.anchor_id = ${anchorId} and l.kind = 'pick' and p.address is not null`;
  for (const p of rows) {
    const rule = p.rule_id ? `rule=${p.rule_id} v${p.version ?? 1}` : "manual";
    await queueFor(
      db,
      p.address,
      NAMESPACE.picks(p.address),
      `PICK · ${p.picked_at.toISOString().slice(0, 16)}Z · ${rule} · ${p.team} ML · conf=${p.confidence.toFixed(2)} · anchor=${digest}`,
      `pick:${p.id}`,
    );
  }
}
