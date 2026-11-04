import { createLogger } from "@hunch/chain";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Agent, agentFrom } from "../anchor/keys.ts";
import { compileByPattern } from "../compiler/patterns.ts";
import { newId } from "../compiler/store.ts";
import { hasTestDb, openTestDb, type TestDb } from "../db/test-db.ts";
import { runRecordMonitor } from "./record.ts";
import { retractPick } from "./signed.ts";

const HUNCH =
  "When the books and Polymarket disagree by 2+ points on an NBA game, the books are right.";

describe.skipIf(!hasTestDb)("runRecordMonitor", () => {
  let test: TestDb;
  let agent: Agent;
  const log = createLogger({ service: "test" });

  beforeAll(async () => {
    test = await openTestDb();
    agent = agentFrom(new Ed25519Keypair());
  });

  afterAll(async () => {
    await test.close();
  });

  it("doesn't sign a new pick after Undo while the condition still holds", async () => {
    const now = new Date();
    const lock = new Date(now.getTime() + 30 * 60_000);
    const address = new Ed25519Keypair().toSuiAddress().toLowerCase();
    await test.db`insert into delegations (id, address, agent, message, signature, until, per_day, test)
      values (${newId("d")}, ${address}, ${agent.address}, 'm', 's',
              ${new Date(now.getTime() + 86_400_000)}, 20, true)`;
    const compiled = compileByPattern(HUNCH, now);
    if (compiled?.kind !== "rule") throw new Error("expected the sports rule");
    const ruleId = newId("r");
    await test.db`insert into rules (id, owner, hunch) values (${ruleId}, ${`sui:${address}`}, ${HUNCH})`;
    await test.db`insert into rule_versions (rule_id, version, rule, compiled_by, stage, on_record_at)
      values (${ruleId}, 1, ${test.db.json(JSON.parse(JSON.stringify(compiled.rule)))}, 'pattern', 'on_record', ${now})`;
    const eventId = `nba:${newId("e")}`;
    await test.db`insert into events (id, league, home, away, home_name, away_name, starts_at, status)
      values (${eventId}, 'NBA', 'CLE', 'BOS', 'Cavaliers', 'Celtics', ${lock}, 'pre')`;
    const seenAt = new Date(now.getTime() - 60_000);
    await test.db`insert into snapshots (event_id, source, home_prob, at, kind)
      values (${eventId}, 'books', 0.64, ${seenAt}, 'live'), (${eventId}, 'polymarket', 0.58, ${seenAt}, 'live')`;

    await runRecordMonitor(test.db, agent, log, now);
    const fired = await test.db<{ id: string }[]>`select id from picks where rule_id = ${ruleId}`;
    expect(fired).toHaveLength(1);
    const pick = fired[0];
    if (!pick) throw new Error("the rule didn't fire");

    expect((await retractPick(test.db, agent, pick.id, address, now)).ok).toBe(true);
    await runRecordMonitor(test.db, agent, log, new Date(now.getTime() + 60_000));
    const after = await test.db`select id from picks where rule_id = ${ruleId}`;
    expect(after).toHaveLength(1);
  });
});
