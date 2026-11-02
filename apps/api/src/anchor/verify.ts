import { addressFromSignature } from "@hunch/memory";
import { endOfDay, parseDelegation } from "../auth/delegation.ts";
import type { Db } from "../db/client.ts";
import type { AnchorRead } from "./chain.ts";
import { signedBy } from "./keys.ts";
import { buildTree, rootFromProof } from "./merkle.ts";
import { hashPayload, type Json } from "./payload.ts";

export interface Check {
  name: string;
  ok: boolean | null;
  detail: string;
}

export interface LoadedPick {
  payload: { [key: string]: Json };
  hash: string;
  signature: string;
  delegation: { message: string; signature: string } | undefined;
  anchor:
    | {
        id: string;
        root: string;
        count: number;
        status: string;
        digest: string | null;
        network: string;
      }
    | undefined;
  leaves: string[];
  position: number | undefined;
  retraction: { payload: { [key: string]: Json }; hash: string; signature: string } | undefined;
}

function str(v: Json | undefined): string {
  return typeof v === "string" ? v : "";
}

export async function checkPick(
  p: LoadedPick,
  read: ((digest: string) => Promise<AnchorRead>) | undefined,
  unavailable = "no Sui client configured (Tatum key)",
): Promise<Check[]> {
  const checks: Check[] = [];
  const lock = new Date(str(p.payload.lock));
  const at = new Date(str(p.payload.at));
  const owner = str(p.payload.owner);
  const agent = str(p.payload.agent);

  const unchanged = hashPayload(p.payload) === p.hash;
  checks.push({
    name: "Unchanged since it was signed",
    ok: unchanged,
    detail: unchanged
      ? `sha256 ${p.hash.slice(0, 16)}…`
      : "the stored pick no longer matches its hash",
  });

  const signer = await signedBy(p.hash, p.signature);
  checks.push({
    name: "Signed by Hunch's agent",
    ok: signer === agent,
    detail:
      signer === agent ? `agent ${agent.slice(0, 10)}…` : "the signature doesn't match the agent",
  });

  if (!p.delegation) {
    checks.push({
      name: "Under the owner's delegation",
      ok: false,
      detail: "no delegation on file",
    });
  } else {
    const terms = parseDelegation(p.delegation.message);
    const delegator = await addressFromSignature(p.delegation.message, p.delegation.signature);
    const ok =
      terms !== undefined &&
      delegator === owner &&
      terms.address === owner &&
      terms.agent === agent &&
      at <= endOfDay(terms.until);
    checks.push({
      name: "Under the owner's delegation",
      ok,
      detail:
        ok && terms
          ? `${owner.slice(0, 10)}… allowed ${terms.perDay} a day until ${terms.until}`
          : "the delegation doesn't cover this pick",
    });
  }

  const beforeLock = at < lock;
  checks.push({
    name: "Logged before lock",
    ok: beforeLock,
    detail: `${Math.round((lock.getTime() - at.getTime()) / 60_000)} min before lock`,
  });

  if (!p.anchor || p.position === undefined || p.anchor.status !== "anchored" || !p.anchor.digest) {
    checks.push({
      name: "In a batch anchored on Sui",
      ok: null,
      detail: "waiting for the next anchor batch",
    });
  } else {
    const tree = buildTree(p.leaves);
    const proof = tree.proofs[p.position] ?? [];
    const inRoot = rootFromProof(p.hash, proof) === p.anchor.root && tree.root === p.anchor.root;
    checks.push({
      name: "In a batch anchored on Sui",
      ok: inRoot,
      detail: inRoot
        ? `leaf ${p.position + 1} of ${p.anchor.count} · proof of ${proof.length} hashes`
        : "the Merkle proof doesn't reach the anchored root",
    });
    if (!read) {
      checks.push({ name: "The anchor reads back from Sui", ok: null, detail: unavailable });
    } else {
      const onChain = await read(p.anchor.digest);
      const match =
        onChain.ok && onChain.rootHex === p.anchor.root && onChain.count === p.anchor.count;
      checks.push({
        name: "The anchor reads back from Sui",
        ok: match,
        detail: onChain.ok
          ? `${p.anchor.network} tx ${p.anchor.digest.slice(0, 12)}… · root ${match ? "matches" : "differs"}`
          : onChain.reason,
      });
      if (onChain.ok) {
        const anchoredBefore = onChain.timestampMs < lock.getTime();
        checks.push({
          name: "Anchored before lock",
          ok: anchoredBefore,
          detail: new Date(onChain.timestampMs).toISOString().replace(".000Z", "Z"),
        });
      }
    }
  }

  if (p.retraction) {
    const rAt = new Date(str(p.retraction.payload.at));
    const rSigner = await signedBy(p.retraction.hash, p.retraction.signature);
    const ok =
      hashPayload(p.retraction.payload) === p.retraction.hash &&
      rSigner === agent &&
      str(p.retraction.payload.pickHash) === p.hash &&
      rAt < lock;
    checks.push({
      name: "Undone before lock (stays on the record, not scored)",
      ok,
      detail: rAt.toISOString().replace(/\.\d{3}Z$/, "Z"),
    });
  }
  return checks;
}

export function verdict(checks: Check[]): "verified" | "pending" | "failed" {
  if (checks.some((c) => c.ok === false)) return "failed";
  if (checks.some((c) => c.ok === null)) return "pending";
  return "verified";
}

export async function loadForVerify(db: Db, pickId: string): Promise<LoadedPick | undefined> {
  const rows = await db<
    {
      payload: { [key: string]: Json } | null;
      hash: string | null;
      signature: string | null;
      delegation_id: string | null;
      retraction: LoadedPick["retraction"] | null;
    }[]
  >`select payload, hash, signature, delegation_id, retraction from picks where id = ${pickId}`;
  const row = rows[0];
  if (!row?.payload || !row.hash || !row.signature) return undefined;
  const delegation = row.delegation_id
    ? (
        await db<{ message: string; signature: string }[]>`
          select message, signature from delegations where id = ${row.delegation_id}`
      )[0]
    : undefined;
  const anchors = await db<
    {
      id: string;
      root: string;
      count: number;
      status: string;
      digest: string | null;
      network: string;
      position: number;
    }[]
  >`select a.id, a.root, a.count, a.status, a.digest, a.network, l.position
    from anchor_leaves l join anchors a on a.id = l.anchor_id
    where l.pick_id = ${pickId} and l.kind = 'pick'
    order by (a.status = 'anchored') desc, a.created_at desc limit 1`;
  const anchor = anchors[0];
  const leaves = anchor
    ? (
        await db<{ leaf: string }[]>`
          select leaf from anchor_leaves where anchor_id = ${anchor.id} order by position`
      ).map((l) => l.leaf)
    : [];
  return {
    payload: row.payload,
    hash: row.hash,
    signature: row.signature,
    delegation,
    anchor,
    leaves,
    position: anchor?.position,
    retraction: row.retraction ?? undefined,
  };
}

export async function cachedRead(
  db: Db,
  digest: string,
  read: (digest: string) => Promise<AnchorRead>,
): Promise<AnchorRead> {
  const cached = await db<
    { result: AnchorRead }[]
  >`select result from anchor_reads where digest = ${digest}`;
  if (cached[0]) return cached[0].result;
  const result = await read(digest);
  if (result.ok) {
    await db`insert into anchor_reads (digest, result) values (${digest}, ${db.json(result)})
             on conflict (digest) do nothing`;
  }
  return result;
}

export async function cachedOnly(db: Db, digest: string): Promise<AnchorRead | undefined> {
  const rows = await db<
    { result: AnchorRead }[]
  >`select result from anchor_reads where digest = ${digest}`;
  return rows[0]?.result;
}
