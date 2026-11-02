import type { Context } from "hono";
import { addressFromAuth } from "../auth/session.ts";
import type { Db } from "../db/client.ts";
import { ownerOf } from "./owner.ts";

export interface Caller {
  address: string | undefined;
  owners: string[];
}

export async function callerOf(db: Db, c: Context): Promise<Caller> {
  const address = await addressFromAuth(db, c.req.header("authorization"));
  const visitor = ownerOf(c.req.header("x-hunch-visitor"));
  const owners = [visitor, ...(address ? [`sui:${address}`] : [])];
  return { address, owners };
}
