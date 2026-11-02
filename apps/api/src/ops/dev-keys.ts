import { appendFileSync, copyFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

const root = resolve(import.meta.dir, "../../../..");
const envPath = resolve(root, ".env");
if (!existsSync(envPath)) copyFileSync(resolve(root, ".env.example"), envPath);
const text = readFileSync(envPath, "utf8");
const current = text.match(/^HUNCH_AGENT_KEY=(.*)$/m)?.[1]?.trim();
if (current) {
  process.stdout.write("HUNCH_AGENT_KEY is already set; left as is.\n");
} else {
  const keypair = new Ed25519Keypair();
  const line = `HUNCH_AGENT_KEY=${keypair.getSecretKey()}`;
  const next = /^HUNCH_AGENT_KEY=$/m.test(text)
    ? text.replace(/^HUNCH_AGENT_KEY=$/m, line)
    : `${text.endsWith("\n") ? "" : "\n"}${line}\n`;
  if (/^HUNCH_AGENT_KEY=$/m.test(text)) {
    await Bun.write(envPath, next);
  } else {
    appendFileSync(envPath, next);
  }
  process.stdout.write(`Wrote a test agent key to .env (agent ${keypair.toSuiAddress()}).\n`);
}
