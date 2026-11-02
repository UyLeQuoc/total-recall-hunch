import { sha256Hex } from "../anchor/merkle.ts";
import type { Db } from "../db/client.ts";

export interface MemoryLine {
  id: string;
  namespace: string;
  text: string;
  status: string;
  blobId: string | null;
  createdAt: string;
}

export async function queueMemory(
  db: Db,
  namespace: string,
  text: string,
  idempotencyKey: string,
): Promise<void> {
  const id = `m_${sha256Hex(idempotencyKey).slice(0, 16)}`;
  await db`insert into memories (id, namespace, text, idempotency_key, status)
           values (${id}, ${namespace}, ${text}, ${idempotencyKey}, 'pending')
           on conflict (idempotency_key) do nothing`;
}

export async function newestLines(
  db: Db,
  namespace: string,
  prefix: string,
): Promise<MemoryLine[]> {
  const rows = await db<
    {
      id: string;
      namespace: string;
      text: string;
      status: string;
      blob_id: string | null;
      created_at: Date;
    }[]
  >`select id, namespace, text, status, blob_id, created_at from memories
    where namespace = ${namespace} and text like ${`${prefix}%`}
    order by created_at desc limit 200`;
  return rows.map((r) => ({
    id: r.id,
    namespace: r.namespace,
    text: r.text,
    status: r.status,
    blobId: r.blob_id,
    createdAt: r.created_at.toISOString(),
  }));
}

export async function memoryCounts(db: Db): Promise<Record<string, number>> {
  const rows = await db<{ status: string; n: number }[]>`
    select status, count(*)::int as n from memories group by status`;
  return Object.fromEntries(rows.map((r) => [r.status, r.n]));
}
