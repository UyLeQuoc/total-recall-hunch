import { tatumUsage } from "@hunch/chain";
import type { Db } from "../db/client.ts";

export const CREDITS_PER_CALL = 2;
let counted: Record<string, number> = {};

export async function persistUsage(db: Db, now = new Date()): Promise<void> {
  const current = tatumUsage();
  const day = now.toISOString().slice(0, 10);
  for (const [method, calls] of Object.entries(current)) {
    const delta = calls - (counted[method] ?? 0);
    if (delta <= 0) continue;
    await db`insert into tatum_usage (day, method, calls) values (${day}, ${method}, ${delta})
             on conflict (day, method) do update set calls = tatum_usage.calls + excluded.calls`;
  }
  counted = { ...current };
}

export async function usageToday(
  db: Db,
  now = new Date(),
): Promise<{ calls: Record<string, number>; credits: number }> {
  const rows = await db<{ method: string; calls: number }[]>`
    select method, calls from tatum_usage where day = ${now.toISOString().slice(0, 10)}`;
  const calls = Object.fromEntries(rows.map((r) => [r.method, r.calls]));
  const total = rows.reduce((a, r) => a + r.calls, 0);
  return { calls, credits: total * CREDITS_PER_CALL };
}
