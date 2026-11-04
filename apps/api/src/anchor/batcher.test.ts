import { createLogger } from "@hunch/chain";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { newId } from "../compiler/store.ts";
import { hasTestDb, openTestDb, type TestDb } from "../db/test-db.ts";
import type { AnchorDeps } from "./batcher.ts";
import { batchDue, failuresInARow, retryWaitMs, runAnchorBatch } from "./batcher.ts";
import { sha256Hex } from "./merkle.ts";

const now = new Date("2026-11-03T00:00:00Z");
const ago = (min: number) => new Date(now.getTime() - min * 60_000);
const ahead = (min: number) => new Date(now.getTime() + min * 60_000);

describe("batchDue", () => {
  it("waits while the batch is young and every lock is far", () => {
    expect(batchDue([{ at: ago(3), lock: ahead(120) }], now)).toBe(false);
  });

  it("goes every 10 minutes", () => {
    expect(batchDue([{ at: ago(10), lock: ahead(120) }], now)).toBe(true);
  });

  it("goes early when a pick's game locks within 15 minutes", () => {
    expect(batchDue([{ at: ago(1), lock: ahead(14) }], now)).toBe(true);
  });

  it("has nothing to do without picks", () => {
    expect(batchDue([], now)).toBe(false);
  });
});

describe("retryWaitMs", () => {
  it("doesn't wait when nothing failed", () => {
    expect(retryWaitMs(0)).toBe(0);
  });

  it("doubles from 2 minutes and stops at 15", () => {
    expect(retryWaitMs(1)).toBe(120_000);
    expect(retryWaitMs(2)).toBe(240_000);
    expect(retryWaitMs(3)).toBe(480_000);
    expect(retryWaitMs(4)).toBe(900_000);
    expect(retryWaitMs(40)).toBe(900_000);
  });
});

describe("failuresInARow", () => {
  it("counts failures up to the last batch that didn't fail", () => {
    expect(
      failuresInARow([{ status: "failed" }, { status: "failed" }, { status: "anchored" }]),
    ).toBe(2);
    expect(failuresInARow([{ status: "anchored" }, { status: "failed" }])).toBe(0);
    expect(failuresInARow([{ status: "failed" }])).toBe(1);
    expect(failuresInARow([])).toBe(0);
  });
});

describe.skipIf(!hasTestDb)("runAnchorBatch", () => {
  let test: TestDb;
  let attempts = 0;
  const log = createLogger({ service: "test" });

  function failingDeps(): AnchorDeps {
    const client = {
      signAndExecuteTransaction: async () => {
        attempts++;
        throw new Error("the sponsor has no gas");
      },
    };
    return {
      client: client as unknown as AnchorDeps["client"],
      signer: new Ed25519Keypair(),
      packageId: "0x1",
      network: "testnet",
      everyMs: 0,
    };
  }

  async function newPick(): Promise<string> {
    const id = newId("p");
    const pickedAt = new Date(Date.now() - 3_600_000);
    await test.db`insert into picks (id, owner, stage, market, side, confidence, why, inputs,
                                     picked_at, expires_at, hash)
      values (${id}, 'sui:0x1', 'on_record', 'nba-ml', 'home', 0.6, 'test', ${test.db.json({})},
              ${pickedAt}, ${new Date(Date.now() + 3_600_000)}, ${sha256Hex(id)})`;
    return id;
  }

  beforeEach(async () => {
    test = await openTestDb();
    attempts = 0;
  });

  afterEach(async () => {
    await test.close();
  });

  it("waits before trying a failed batch again", async () => {
    await newPick();
    const deps = failingDeps();
    await runAnchorBatch(test.db, deps, log);
    await runAnchorBatch(test.db, deps, log);
    expect(attempts).toBe(1);
    await runAnchorBatch(test.db, deps, log, new Date(Date.now() + 121_000));
    expect(attempts).toBe(2);
  });

  it("frees the picks of a batch left pending by a crash", async () => {
    const pickId = await newPick();
    const stuck = newId("a");
    await test.db`insert into anchors (id, root, count, network, status, created_at)
      values (${stuck}, 'root', 1, 'testnet', 'pending', ${new Date(Date.now() - 3_600_000)})`;
    await test.db`insert into anchor_leaves (anchor_id, leaf, kind, pick_id, position)
      values (${stuck}, ${sha256Hex(pickId)}, 'pick', ${pickId}, 0)`;
    await runAnchorBatch(test.db, failingDeps(), log);
    const rows = await test.db<
      { status: string }[]
    >`select status from anchors where id = ${stuck}`;
    expect(rows[0]?.status).toBe("failed");
    expect(attempts).toBe(1);
  });
});
