import { randomBytes } from "node:crypto";
import { addressFromSignature } from "@hunch/memory";
import type { ClientWithCoreApi } from "@mysten/sui/client";
import { newId } from "../compiler/store.ts";
import type { Db } from "../db/client.ts";
import { delegationMessage, endOfDay, parseDelegation } from "./delegation.ts";
import { createSession } from "./session.ts";

const CHALLENGE_MS = 10 * 60_000;
const DEFAULT_DAYS = 28;
export const MAX_PER_DAY = 20;

export interface Delegation {
  id: string;
  address: string;
  agent: string;
  until: string;
  perDay: number;
  test: boolean;
  message: string;
  signature: string;
}

export async function challenge(
  db: Db,
  address: string,
  agent: string,
  now = new Date(),
): Promise<{ message: string; nonce: string }> {
  const nonce = randomBytes(12).toString("hex");
  const until = new Date(now.getTime() + DEFAULT_DAYS * 86_400_000).toISOString().slice(0, 10);
  const message = delegationMessage({
    address: address.toLowerCase(),
    agent,
    until,
    perDay: MAX_PER_DAY,
    nonce,
  });
  await db`delete from challenges where expires_at < now()`;
  await db`insert into challenges (nonce, message, expires_at)
           values (${nonce}, ${message}, ${new Date(now.getTime() + CHALLENGE_MS)})`;
  return { message, nonce };
}

export type AcceptResult =
  | { ok: true; token: string; delegation: Delegation }
  | { ok: false; reason: string };

export async function acceptDelegation(
  db: Db,
  input: { message: string; signature: string; test: boolean; visitor?: string | undefined },
  agent: string,
  client: ClientWithCoreApi | undefined,
): Promise<AcceptResult> {
  const terms = parseDelegation(input.message);
  if (!terms) return { ok: false, reason: "That isn't the delegation Hunch asked you to sign." };
  const pending = await db<{ message: string }[]>`
    delete from challenges where nonce = ${terms.nonce} and expires_at > now() returning message`;
  if (pending[0]?.message !== input.message) {
    return { ok: false, reason: "That request expired. Ask for a new one and sign it." };
  }
  if (terms.agent !== agent) return { ok: false, reason: "The delegation names another agent." };
  const signer = await addressFromSignature(input.message, input.signature, client);
  if (signer !== terms.address) {
    return { ok: false, reason: "The signature doesn't match that address." };
  }
  const id = newId("d");
  await db`update delegations set revoked_at = now() where address = ${terms.address} and revoked_at is null`;
  await db`insert into delegations (id, address, agent, message, signature, until, per_day, test)
           values (${id}, ${terms.address}, ${agent}, ${input.message}, ${input.signature},
                   ${endOfDay(terms.until)}, ${terms.perDay}, ${input.test})`;
  if (input.visitor) {
    await db`update rules set owner = ${`sui:${terms.address}`} where owner = ${`visitor:${input.visitor}`}`;
    await db`update picks set owner = ${`sui:${terms.address}`}, address = ${terms.address}
             where owner = ${`visitor:${input.visitor}`}`;
  }
  const token = await createSession(db, terms.address);
  return {
    ok: true,
    token,
    delegation: {
      id,
      address: terms.address,
      agent,
      until: terms.until,
      perDay: terms.perDay,
      test: input.test,
      message: input.message,
      signature: input.signature,
    },
  };
}

export async function activeDelegation(
  db: Db,
  address: string,
  now = new Date(),
): Promise<Delegation | undefined> {
  const rows = await db<
    {
      id: string;
      address: string;
      agent: string;
      until: Date;
      per_day: number;
      test: boolean;
      message: string;
      signature: string;
    }[]
  >`select id, address, agent, until, per_day, test, message, signature from delegations
    where address = ${address} and revoked_at is null and until > ${now}
    order by created_at desc limit 1`;
  const r = rows[0];
  if (!r) return undefined;
  return {
    id: r.id,
    address: r.address,
    agent: r.agent,
    until: r.until.toISOString().slice(0, 10),
    perDay: r.per_day,
    test: r.test,
    message: r.message,
    signature: r.signature,
  };
}
