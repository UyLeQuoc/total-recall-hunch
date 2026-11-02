import type { Logger } from "@hunch/chain";
import { createClient, limiterFor, runLimited, scope } from "@hunch/memory";
import type { Db } from "../db/client.ts";
import type { Env } from "../env/schema.ts";

const BULK_MAX = 20;
const MAX_ATTEMPTS = 3;
const RECALL_TRIES = 4;

export interface Operator {
  key: string;
  accountId: string;
  serverUrl: string;
}

export function operatorFrom(env: Env): Operator | undefined {
  if (!env.MEMWAL_ACCOUNT_ID || !env.MEMWAL_PRIVATE_KEY) return undefined;
  return {
    key: env.MEMWAL_PRIVATE_KEY,
    accountId: env.MEMWAL_ACCOUNT_ID,
    serverUrl: env.MEMWAL_SERVER_URL,
  };
}

interface PendingRow {
  id: string;
  namespace: string;
  text: string;
  idempotency_key: string;
  attempts: number;
}

async function submit(db: Db, op: Operator, log: Logger): Promise<void> {
  const pending = await db<PendingRow[]>`
    select id, namespace, text, idempotency_key, attempts from memories
    where status = 'pending' order by created_at limit 100`;
  const byNamespace = new Map<string, PendingRow[]>();
  for (const row of pending)
    byNamespace.set(row.namespace, [...(byNamespace.get(row.namespace) ?? []), row]);
  const limiter = limiterFor(op.key);
  for (const [namespace, rows] of byNamespace) {
    for (let i = 0; i < rows.length; i += BULK_MAX) {
      const chunk = rows.slice(i, i + BULK_MAX);
      const client = createClient(scope(op, namespace));
      try {
        const accepted = await runLimited(limiter, () =>
          client.rememberBulk(
            chunk.map((r) => ({ text: r.text, namespace })),
            {
              idempotencyKey: chunk
                .map((r) => r.idempotency_key)
                .join("|")
                .slice(0, 200),
            },
          ),
        );
        for (const [j, row] of chunk.entries()) {
          await db`update memories set status = 'submitted', job_id = ${accepted.job_ids[j] ?? null},
                     attempts = attempts + 1 where id = ${row.id}`;
        }
      } catch (err) {
        log.warn("memory write refused", { namespace, lines: chunk.length, reason: String(err) });
        for (const row of chunk) {
          await db`update memories set attempts = attempts + 1, error = ${String(err).slice(0, 300)},
                     status = ${row.attempts + 1 >= MAX_ATTEMPTS ? "failed" : "pending"} where id = ${row.id}`;
        }
      }
    }
  }
}

async function settle(db: Db, op: Operator): Promise<void> {
  const submitted = await db<
    { id: string; namespace: string; job_id: string | null; attempts: number }[]
  >`
    select id, namespace, job_id, attempts from memories where status = 'submitted' and job_id is not null limit 100`;
  if (submitted.length === 0) return;
  const client = createClient(scope(op, submitted[0]?.namespace ?? ""));
  const status = await runLimited(limiterFor(op.key), () =>
    client.getRememberBulkStatus(submitted.map((s) => s.job_id ?? "")),
  );
  for (const item of status.results) {
    const row = submitted.find((s) => s.job_id === item.job_id);
    if (!row) continue;
    if (item.status === "done" && item.blob_id) {
      await db`update memories set status = 'written', blob_id = ${item.blob_id}, written_at = now(), error = null
               where id = ${row.id}`;
    } else if (item.status === "failed" || item.status === "not_found") {
      await db`update memories set status = ${row.attempts >= MAX_ATTEMPTS ? "failed" : "pending"},
                 error = ${item.error ?? item.status} where id = ${row.id}`;
    }
  }
}

export async function flushMemories(db: Db, op: Operator | undefined, log: Logger): Promise<void> {
  if (!op) return;
  await submit(db, op, log);
  await settle(db, op);
}

export async function recallLines(
  op: Operator,
  namespace: string,
  query: string,
): Promise<{ text: string; blobId: string }[]> {
  const client = createClient(scope(op, namespace));
  for (let attempt = 1; attempt <= RECALL_TRIES; attempt++) {
    const result = await runLimited(limiterFor(op.key), () =>
      client.recall({ query, namespace, limit: 50, maxDistance: 0.8 }),
    );
    if (result.results.length > 0 || !result.dropped_count) {
      return result.results.map((r) => ({ text: r.text, blobId: r.blob_id }));
    }
    await new Promise((r) => setTimeout(r, 400 * attempt));
  }
  return [];
}
