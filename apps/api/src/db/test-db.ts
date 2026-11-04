import { randomUUID } from "node:crypto";
import postgres from "postgres";
import type { Db } from "./client.ts";
import { migrate } from "./migrate.ts";

const url = process.env.HUNCH_TEST_DATABASE_URL;

export const hasTestDb = Boolean(url);

export interface TestDb {
  db: Db;
  close: () => Promise<void>;
}

export async function openTestDb(): Promise<TestDb> {
  if (!url) throw new Error("HUNCH_TEST_DATABASE_URL isn't set");
  if (!new URL(url).pathname.includes("test")) {
    throw new Error("HUNCH_TEST_DATABASE_URL must name a test database");
  }
  const schema = `t_${randomUUID().replaceAll("-", "")}`;
  const admin = postgres(url, { max: 1, onnotice: () => {} });
  await admin.unsafe(`create schema ${schema}`);
  const db = postgres(url, { max: 4, onnotice: () => {}, connection: { search_path: schema } });
  await migrate(db);
  return {
    db,
    close: async () => {
      await db.end();
      await admin.unsafe(`drop schema ${schema} cascade`);
      await admin.end();
    },
  };
}
