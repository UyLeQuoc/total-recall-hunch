import type { Logger } from "@hunch/chain";
import type { Keypair } from "@mysten/sui/cryptography";
import type { SuiGrpcClient } from "@mysten/sui/grpc";
import { newId } from "../compiler/store.ts";
import type { Db } from "../db/client.ts";
import { rememberAnchoredPicks } from "../memory/lines.ts";
import { submitAnchor } from "./chain.ts";
import { buildTree } from "./merkle.ts";

const BEFORE_LOCK_MS = 15 * 60_000;
const STUCK_MS = 15 * 60_000;
const FIRST_RETRY_MS = 2 * 60_000;
const LONGEST_RETRY_MS = 15 * 60_000;

export interface AnchorDeps {
  client: SuiGrpcClient;
  signer: Keypair;
  packageId: string;
  network: "testnet" | "localnet";
  everyMs: number;
}

interface Leaf {
  pickId: string;
  kind: "pick" | "retract";
  hash: string;
  lock: Date;
  at: Date;
}

async function unanchored(db: Db): Promise<Leaf[]> {
  const rows = await db<
    { id: string; kind: "pick" | "retract"; hash: string; lock: Date; at: Date }[]
  >`
    select p.id, 'pick' as kind, p.hash, p.expires_at as lock, p.picked_at as at from picks p
    where p.stage = 'on_record' and p.hash is not null and not exists (
      select 1 from anchor_leaves l join anchors a on a.id = l.anchor_id
      where l.pick_id = p.id and l.kind = 'pick' and a.status in ('pending', 'anchored'))
    union all
    select p.id, 'retract' as kind, p.retraction->>'hash' as hash, p.expires_at as lock, p.retracted_at as at from picks p
    where p.retraction is not null and not exists (
      select 1 from anchor_leaves l join anchors a on a.id = l.anchor_id
      where l.pick_id = p.id and l.kind = 'retract' and a.status in ('pending', 'anchored'))
    order by at`;
  return rows.map((r) => ({ pickId: r.id, kind: r.kind, hash: r.hash, lock: r.lock, at: r.at }));
}

export function batchDue(
  leaves: { lock: Date; at: Date }[],
  now: Date,
  everyMs = 10 * 60_000,
): boolean {
  if (leaves.length === 0) return false;
  const oldest = Math.min(...leaves.map((l) => l.at.getTime()));
  const soonestLock = Math.min(...leaves.map((l) => l.lock.getTime()));
  return now.getTime() - oldest >= everyMs || soonestLock - now.getTime() <= BEFORE_LOCK_MS;
}

export function retryWaitMs(failures: number): number {
  if (failures <= 0) return 0;
  return Math.min(FIRST_RETRY_MS * 2 ** (failures - 1), LONGEST_RETRY_MS);
}

export function failuresInARow(newestFirst: { status: string }[]): number {
  const stop = newestFirst.findIndex((a) => a.status !== "failed");
  return stop === -1 ? newestFirst.length : stop;
}

async function releaseStuckBatches(db: Db, now: Date, log: Logger): Promise<void> {
  const released = await db<{ id: string }[]>`
    update anchors set status = 'failed', error = 'stopped before it finished'
    where status = 'pending' and created_at < ${new Date(now.getTime() - STUCK_MS)}
    returning id`;
  for (const { id } of released) {
    log.warn("anchor batch was stuck; its picks go in the next batch", { anchor: id });
  }
}

async function waitingToRetry(db: Db, now: Date): Promise<boolean> {
  const recent = await db<{ status: string; created_at: Date }[]>`
    select status, created_at from anchors order by created_at desc limit 4`;
  const newest = recent[0];
  if (!newest) return false;
  return now.getTime() - newest.created_at.getTime() < retryWaitMs(failuresInARow(recent));
}

export async function pendingLeaves(db: Db): Promise<number> {
  return (await unanchored(db)).length;
}

export async function runAnchorBatch(
  db: Db,
  deps: AnchorDeps | undefined,
  log: Logger,
  now = new Date(),
): Promise<string | undefined> {
  if (!deps) return undefined;
  await releaseStuckBatches(db, now, log);
  const leaves = await unanchored(db);
  if (!batchDue(leaves, now, deps.everyMs)) return undefined;
  if (await waitingToRetry(db, now)) return undefined;
  const tree = buildTree(leaves.map((l) => l.hash));
  const id = newId("a");
  await db.begin(async (tx) => {
    await tx`insert into anchors (id, root, count, network, status)
             values (${id}, ${tree.root}, ${leaves.length}, ${deps.network}, 'pending')`;
    for (const [position, leaf] of leaves.entries()) {
      await tx`insert into anchor_leaves (anchor_id, leaf, kind, pick_id, position)
               values (${id}, ${leaf.hash}, ${leaf.kind}, ${leaf.pickId}, ${position})`;
    }
  });
  let digest: string;
  try {
    const receipt = await submitAnchor(
      deps.client,
      deps.signer,
      deps.packageId,
      tree.root,
      leaves.length,
    );
    digest = receipt.digest;
    if (!receipt.settled)
      log.warn("anchor executed but hasn't settled yet", { anchor: id, digest });
  } catch (err) {
    await db`update anchors set status = 'failed', error = ${String(err).slice(0, 300)} where id = ${id}`;
    log.warn("anchor failed; the picks wait for the next batch", {
      anchor: id,
      reason: String(err),
    });
    return undefined;
  }
  await db`update anchors set status = 'anchored', digest = ${digest}, anchored_at = now()
           where id = ${id}`;
  log.info("anchored", { anchor: id, picks: leaves.length, digest });
  await rememberAnchoredPicks(db, id, digest);
  return digest;
}
