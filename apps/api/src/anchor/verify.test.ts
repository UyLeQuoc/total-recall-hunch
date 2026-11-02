import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { describe, expect, it } from "vitest";
import { delegationMessage } from "../auth/delegation.ts";
import { agentFrom } from "./keys.ts";
import { buildTree, sha256Hex } from "./merkle.ts";
import { hashPayload, type PickPayload } from "./payload.ts";
import { checkPick, type LoadedPick, verdict } from "./verify.ts";

async function signedPick(): Promise<LoadedPick> {
  const agentKey = new Ed25519Keypair();
  const owner = new Ed25519Keypair();
  const agent = agentFrom(agentKey);
  const address = owner.toSuiAddress().toLowerCase();
  const message = delegationMessage({
    address,
    agent: agent.address,
    until: "2026-11-30",
    perDay: 20,
    nonce: "n",
  });
  const { signature: delegationSig } = await owner.signPersonalMessage(
    new TextEncoder().encode(message),
  );
  const payload: PickPayload = {
    v: 1,
    kind: "pick",
    pick: "p_1",
    rule: "r_1",
    version: 1,
    event: "nba:1",
    market: "nba-ml",
    side: "home",
    team: "CLE",
    confidence: 0.62,
    seen: { books: { p: 0.62, at: "2026-11-02T23:28:00.000Z" } },
    at: "2026-11-02T23:30:00.000Z",
    lock: "2026-11-03T00:00:00.000Z",
    owner: address,
    delegation: "d_1",
    agent: agent.address,
  };
  const hash = hashPayload(payload);
  const leaves = [sha256Hex("x"), hash, sha256Hex("y")];
  const tree = buildTree(leaves);
  return {
    payload,
    hash,
    signature: await agent.sign(hash),
    delegation: { message, signature: delegationSig },
    anchor: {
      id: "a_1",
      root: tree.root,
      count: 3,
      status: "anchored",
      digest: "D1",
      network: "localnet",
    },
    leaves,
    position: 1,
    retraction: undefined,
  };
}

describe("checkPick", () => {
  it("verifies a signed, delegated pick anchored before lock", async () => {
    const pick = await signedPick();
    const root = pick.anchor?.root ?? "";
    const checks = await checkPick(pick, async () => ({
      ok: true,
      rootHex: root,
      count: 3,
      timestampMs: Date.parse("2026-11-02T23:40:00Z"),
      sender: "0x1",
    }));
    expect(verdict(checks)).toBe("verified");
  });

  it("fails a pick that was changed after it was signed", async () => {
    const pick = await signedPick();
    pick.payload.confidence = 0.9;
    const checks = await checkPick(pick, undefined);
    expect(checks.find((c) => c.name.startsWith("Unchanged"))?.ok).toBe(false);
    expect(verdict(checks)).toBe("failed");
  });

  it("is pending until its batch is anchored", async () => {
    const pick = await signedPick();
    pick.anchor = undefined;
    expect(verdict(await checkPick(pick, undefined))).toBe("pending");
  });

  it("fails when the chain holds a different root", async () => {
    const pick = await signedPick();
    const checks = await checkPick(pick, async () => ({
      ok: true,
      rootHex: "00".repeat(32),
      count: 3,
      timestampMs: Date.parse("2026-11-02T23:40:00Z"),
      sender: "0x1",
    }));
    expect(verdict(checks)).toBe("failed");
  });
});
