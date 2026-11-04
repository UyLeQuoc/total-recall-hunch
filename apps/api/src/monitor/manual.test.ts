import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Agent, agentFrom } from "../anchor/keys.ts";
import { newId } from "../compiler/store.ts";
import { hasTestDb, openTestDb, type TestDb } from "../db/test-db.ts";
import { manualPick } from "./manual.ts";

describe.skipIf(!hasTestDb)("manualPick", () => {
  let test: TestDb;
  let agent: Agent;
  let address: string;

  async function newEvent(status: string): Promise<string> {
    const id = `nba:${newId("e")}`;
    await test.db`insert into events (id, league, home, away, home_name, away_name, starts_at, status)
      values (${id}, 'NBA', 'DET', 'PHI', 'Pistons', '76ers',
              ${new Date(Date.now() + 3_600_000)}, ${status})`;
    return id;
  }

  beforeAll(async () => {
    test = await openTestDb();
    agent = agentFrom(new Ed25519Keypair());
    address = new Ed25519Keypair().toSuiAddress().toLowerCase();
    await test.db`insert into delegations (id, address, agent, message, signature, until, per_day, test)
      values (${newId("d")}, ${address}, ${agent.address}, 'm', 's',
              ${new Date(Date.now() + 86_400_000)}, 20, true)`;
  });

  afterAll(async () => {
    await test.close();
  });

  it("takes a pick on a game that hasn't started", async () => {
    const eventId = await newEvent("pre");
    expect((await manualPick(test.db, agent, address, eventId, "home", 0.6)).ok).toBe(true);
  });

  it("refuses a game that started before its listed time", async () => {
    const eventId = await newEvent("in");
    const result = await manualPick(test.db, agent, address, eventId, "home", 0.6);
    expect(result).toMatchObject({ ok: false, status: 409 });
    const rows = await test.db`select id from picks where event_id = ${eventId}`;
    expect(rows).toHaveLength(0);
  });
});
