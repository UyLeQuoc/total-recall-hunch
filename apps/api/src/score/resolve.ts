import type { Db } from "../db/client.ts";
import { brier } from "./brier.ts";

export async function resolveSportsPicks(db: Db): Promise<number> {
  const due = await db<{ id: string; side: string; confidence: number; winner: string }[]>`
    select p.id, p.side, p.confidence, e.winner from picks p join events e on e.id = p.event_id
    where p.event_id is not null and p.outcome is null and p.retracted_at is null
      and e.status = 'post' and e.winner is not null`;
  for (const p of due) {
    const right = p.side === p.winner;
    await db`update picks set outcome = ${right ? 1 : 0}, brier = ${brier(p.confidence, right)}
             where id = ${p.id} and outcome is null`;
  }
  return due.length;
}
