import { randomBytes } from "node:crypto";
import { sha256Hex } from "../anchor/merkle.ts";
import type { Db } from "../db/client.ts";

export async function createSession(db: Db, address: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await db`insert into sessions (token_hash, address) values (${sha256Hex(token)}, ${address})`;
  return token;
}

export async function addressFromAuth(
  db: Db,
  header: string | undefined,
): Promise<string | undefined> {
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : undefined;
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return undefined;
  const rows = await db<{ address: string }[]>`
    select address from sessions where token_hash = ${sha256Hex(token)}`;
  return rows[0]?.address;
}
