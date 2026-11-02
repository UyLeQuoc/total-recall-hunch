import { bcs } from "@mysten/sui/bcs";
import { decodeSuiPrivateKey, type Keypair } from "@mysten/sui/cryptography";
import type { SuiGrpcClient } from "@mysten/sui/grpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { fromHex, normalizeSuiAddress, toHex } from "@mysten/sui/utils";
import { z } from "zod";

const ROOT_BYTES = 32;

const AnchoredEvent = bcs.struct("Anchored", {
  root: bcs.vector(bcs.u8()),
  count: bcs.u64(),
  timestamp_ms: bcs.u64(),
  by: bcs.Address,
});

export interface AnchorReceipt {
  digest: string;
  rootHex: string;
  count: number;
}

export type AnchorRead =
  | { ok: true; rootHex: string; count: number; timestampMs: number; sender: string }
  | { ok: false; reason: string };

function rootBytes(rootHex: string): Uint8Array {
  const bytes = fromHex(rootHex.replace(/^0x/, ""));
  if (bytes.length !== ROOT_BYTES)
    throw new Error(`an anchor root is ${ROOT_BYTES} bytes, got ${bytes.length}`);
  return bytes;
}

export function signerFromSuiPrivateKey(secret: string): Keypair {
  const parsed = decodeSuiPrivateKey(secret);
  if (parsed.scheme !== "ED25519") throw new Error(`expected an Ed25519 key, got ${parsed.scheme}`);
  return Ed25519Keypair.fromSecretKey(parsed.secretKey);
}

const buildDump = z.object({
  modules: z.array(z.string()).min(1),
  dependencies: z.array(z.string()),
});
export type BuildDump = z.infer<typeof buildDump>;

export function parseBuildDump(stdout: string): BuildDump {
  const start = stdout.indexOf("{");
  if (start < 0) throw new Error("sui move build printed no bytecode");
  const parsed = buildDump.safeParse(JSON.parse(stdout.slice(start)));
  if (!parsed.success) throw new Error("sui move build printed an unexpected shape");
  return parsed.data;
}

export interface PublishReceipt {
  digest: string;
  packageId: string;
}

export async function publishPackage(
  client: SuiGrpcClient,
  signer: Keypair,
  modules: string[],
  dependencies: string[],
): Promise<PublishReceipt> {
  const sender = signer.toSuiAddress();
  const tx = new Transaction();
  tx.setSender(sender);
  const upgradeCap = tx.publish({ modules, dependencies });
  tx.transferObjects([upgradeCap], sender);
  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer,
    include: { effects: true },
  });
  if (result.$kind === "FailedTransaction") {
    const status = result.FailedTransaction.status;
    throw new Error(`the publish failed: ${status.success ? "unknown" : status.error.message}`);
  }
  const written = result.Transaction.effects.changedObjects.find(
    (o) => o.outputState === "PackageWrite",
  );
  if (!written) throw new Error("the publish wrote no package");
  await client.waitForTransaction({ digest: result.Transaction.digest });
  return { digest: result.Transaction.digest, packageId: normalizeSuiAddress(written.objectId) };
}

export function anchorEventType(packageId: string): string {
  return `${normalizeSuiAddress(packageId)}::anchor::Anchored`;
}

export async function submitAnchor(
  client: SuiGrpcClient,
  signer: Keypair,
  packageId: string,
  rootHex: string,
  count: number,
): Promise<AnchorReceipt> {
  const root = rootBytes(rootHex);
  if (!Number.isInteger(count) || count <= 0) throw new Error("an anchor needs at least one pick");
  const tx = new Transaction();
  tx.setSender(signer.toSuiAddress());
  tx.moveCall({
    target: `${normalizeSuiAddress(packageId)}::anchor::anchor`,
    arguments: [tx.pure.vector("u8", root), tx.pure.u64(count), tx.object.clock()],
  });
  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer,
    include: { effects: true },
  });
  if (result.$kind === "FailedTransaction") {
    const error = result.FailedTransaction.status.success
      ? "unknown"
      : result.FailedTransaction.status.error.message;
    throw new Error(`the anchor transaction failed: ${error}`);
  }
  const digest = result.Transaction.digest;
  await client.waitForTransaction({ digest });
  return { digest, rootHex: toHex(root), count };
}

function isNotFound(err: unknown): boolean {
  const e = err as { code?: unknown; message?: unknown } | null;
  return (
    e?.code === "NOT_FOUND" || (typeof e?.message === "string" && /not found/i.test(e.message))
  );
}

export async function readAnchor(
  client: SuiGrpcClient,
  digest: string,
  packageId: string,
): Promise<AnchorRead> {
  let result: Awaited<ReturnType<typeof client.getTransaction<{ events: true }>>>;
  try {
    result = await client.getTransaction({ digest, include: { events: true } });
  } catch (err) {
    if (isNotFound(err)) return { ok: false, reason: "no transaction has that digest" };
    throw err;
  }
  if (result.$kind === "FailedTransaction")
    return { ok: false, reason: "the anchor transaction failed" };
  const type = anchorEventType(packageId);
  const event = result.Transaction.events.find((e) => e.eventType === type);
  if (!event) return { ok: false, reason: "the transaction emitted no Hunch anchor" };
  const parsed = AnchoredEvent.parse(event.bcs);
  return {
    ok: true,
    rootHex: toHex(Uint8Array.from(parsed.root)),
    count: Number(parsed.count),
    timestampMs: Number(parsed.timestamp_ms),
    sender: normalizeSuiAddress(parsed.by),
  };
}
