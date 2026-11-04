import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Agent, agentFrom } from "../anchor/keys.ts";
import { newId } from "../compiler/store.ts";
import { hasTestDb, openTestDb, type TestDb } from "../db/test-db.ts";
import { createSignedPick, retractPick, type SignedPickInput } from "./signed.ts";

describe.skipIf(!hasTestDb)("signed picks", () => {
  let test: TestDb;
  let agent: Agent;
  const lock = new Date(Date.now() + 2 * 3_600_000);

  async function newOwner(perDay = 20): Promise<string> {
    const address = new Ed25519Keypair().toSuiAddress().toLowerCase();
    await test.db`insert into delegations (id, address, agent, message, signature, until, per_day, test)
      values (${newId("d")}, ${address}, ${agent.address}, 'm', 's',
              ${new Date(Date.now() + 86_400_000)}, ${perDay}, true)`;
    return address;
  }

  function input(address: string, overrides: Partial<SignedPickInput> = {}): SignedPickInput {
    return {
      address,
      market: "nba-ml",
      ruleId: null,
      version: null,
      eventId: `nba:${newId("e")}`,
      side: "home",
      team: "CLE",
      confidence: 0.6,
      seen: {},
      lock,
      why: "picked by hand",
      limitPerDay: null,
      ...overrides,
    };
  }

  async function picksFor(address: string): Promise<number> {
    const rows = await test.db`select id from picks where address = ${address}`;
    return rows.length;
  }

  beforeAll(async () => {
    test = await openTestDb();
    agent = agentFrom(new Ed25519Keypair());
  });

  afterAll(async () => {
    await test.close();
  });

  it("lets only one of two simultaneous picks on a game through", async () => {
    const address = await newOwner();
    const pick = input(address);
    const results = await Promise.all([
      createSignedPick(test.db, agent, pick),
      createSignedPick(test.db, agent, pick),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toMatchObject({ status: 409 });
    expect(await picksFor(address)).toBe(1);
  });

  it("holds the delegation's daily limit under simultaneous picks", async () => {
    const address = await newOwner(1);
    const results = await Promise.all([
      createSignedPick(test.db, agent, input(address)),
      createSignedPick(test.db, agent, input(address)),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toMatchObject({ status: 429 });
  });

  it("lets a hand pick be made again after Undo", async () => {
    const address = await newOwner();
    const pick = input(address);
    const first = await createSignedPick(test.db, agent, pick);
    if (!first.ok) throw new Error(first.reason);
    expect((await retractPick(test.db, agent, first.pickId, address)).ok).toBe(true);
    expect((await createSignedPick(test.db, agent, pick)).ok).toBe(true);
  });

  it("doesn't let a rule pick a game again after Undo", async () => {
    const address = await newOwner();
    const pick = input(address, { ruleId: newId("r"), version: 1 });
    const first = await createSignedPick(test.db, agent, pick);
    if (!first.ok) throw new Error(first.reason);
    expect((await retractPick(test.db, agent, first.pickId, address)).ok).toBe(true);
    expect(await createSignedPick(test.db, agent, pick)).toMatchObject({ ok: false, status: 409 });
  });

  it("keeps the first retraction when Undo is sent twice at once", async () => {
    const address = await newOwner();
    const first = await createSignedPick(test.db, agent, input(address));
    if (!first.ok) throw new Error(first.reason);
    const results = await Promise.all([
      retractPick(test.db, agent, first.pickId, address, new Date(Date.now() - 1_000)),
      retractPick(test.db, agent, first.pickId, address),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toMatchObject({ status: 409 });
  });
});
