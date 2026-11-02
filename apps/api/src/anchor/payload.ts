import { sha256Hex } from "./merkle.ts";

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export function canonical(value: Json): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys
      .filter((k) => value[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonical(value[k] ?? null)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashPayload(value: Json): string {
  return sha256Hex(canonical(value));
}

export interface PickPayload {
  [key: string]: Json;
  v: 1;
  kind: "pick";
  pick: string;
  rule: string | null;
  version: number | null;
  event: string;
  market: string;
  side: string;
  team: string;
  confidence: number;
  seen: { [source: string]: { p: number; at: string } };
  at: string;
  lock: string;
  owner: string;
  delegation: string;
  agent: string;
}

export interface RetractPayload {
  [key: string]: Json;
  v: 1;
  kind: "retract";
  pick: string;
  pickHash: string;
  at: string;
  owner: string;
  delegation: string;
  agent: string;
}
