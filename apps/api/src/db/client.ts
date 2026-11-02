import postgres from "postgres";

export type Db = postgres.Sql;

export function connect(url: string): Db {
  return postgres(url, { max: 10, onnotice: () => {} });
}
