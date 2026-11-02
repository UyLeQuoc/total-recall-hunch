import { loadEnv, withoutBlanks } from "@hunch/memory";
import { type Env, envSchema } from "./schema.ts";

export function loadServerEnv(): Env {
  loadEnv();
  const parsed = envSchema.safeParse(withoutBlanks(process.env));
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    process.stderr.write(`Hunch API can't start, the env is invalid: ${issues}\n`);
    process.exit(1);
  }
  return parsed.data;
}
