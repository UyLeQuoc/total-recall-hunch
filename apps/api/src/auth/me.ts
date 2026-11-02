import type { Db } from "../db/client.ts";
import { activeDelegation, type Delegation } from "./service.ts";

export interface Me {
  address: string;
  delegation: Omit<Delegation, "message" | "signature"> | null;
  rules: {
    id: string;
    name: string;
    version: number;
    stage: string;
    paused: boolean;
    picks: number;
  }[];
  picks: {
    id: string;
    label: string;
    team: string;
    confidence: number;
    pickedAt: string;
    lock: string;
    outcome: "pending" | "right" | "wrong";
    retracted: boolean;
    ruleId: string | null;
  }[];
  notifications: { id: number; pickId: string | null; text: string; at: string; read: boolean }[];
}

export async function loadMe(db: Db, address: string): Promise<Me> {
  const delegation = await activeDelegation(db, address);
  const rules = await db<
    { id: string; name: string; version: number; stage: string; paused: boolean; picks: number }[]
  >`select distinct on (r.id) r.id, v.rule->>'name' as name, v.version, v.stage, r.paused,
      (select count(*)::int from picks p where p.rule_id = r.id) as picks
    from rules r join rule_versions v on v.rule_id = r.id
    where r.owner = ${`sui:${address}`}
    order by r.id, v.version desc`;
  const picks = await db<
    {
      id: string;
      home: string | null;
      away: string | null;
      side: string;
      confidence: number;
      picked_at: Date;
      expires_at: Date;
      outcome: number | null;
      retracted_at: Date | null;
      rule_id: string | null;
    }[]
  >`select p.id, e.home, e.away, p.side, p.confidence, p.picked_at, p.expires_at, p.outcome, p.retracted_at, p.rule_id
    from picks p left join events e on e.id = p.event_id
    where p.address = ${address} and p.stage = 'on_record'
    order by p.picked_at desc limit 40`;
  const notes = await db<
    { id: number; pick_id: string | null; text: string; created_at: Date; read_at: Date | null }[]
  >`
    select id, pick_id, text, created_at, read_at from notifications
    where address = ${address} order by created_at desc limit 20`;
  return {
    address,
    delegation: delegation
      ? {
          id: delegation.id,
          address,
          agent: delegation.agent,
          until: delegation.until,
          perDay: delegation.perDay,
          test: delegation.test,
        }
      : null,
    rules: rules.sort((a, b) => b.picks - a.picks),
    picks: picks.map((p) => ({
      id: p.id,
      label: p.home && p.away ? `${p.away} @ ${p.home}` : "BTC",
      team: p.home && p.away ? (p.side === "home" ? p.home : p.away) : p.side,
      confidence: p.confidence,
      pickedAt: p.picked_at.toISOString(),
      lock: p.expires_at.toISOString(),
      outcome: p.outcome === null ? "pending" : p.outcome === 1 ? "right" : "wrong",
      retracted: p.retracted_at !== null,
      ruleId: p.rule_id,
    })),
    notifications: notes.map((n) => ({
      id: n.id,
      pickId: n.pick_id,
      text: n.text,
      at: n.created_at.toISOString(),
      read: n.read_at !== null,
    })),
  };
}
