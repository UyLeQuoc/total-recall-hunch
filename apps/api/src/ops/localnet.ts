import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { parseBuildDump, publishPackage } from "../anchor/chain.ts";
import { anchorClient } from "../anchor/sui-client.ts";

const ROOT = resolve(import.meta.dir, "../../../..");
const HOME = resolve(ROOT, ".localnet");
const ENV_PATH = resolve(ROOT, ".env");
const GRPC = "http://127.0.0.1:9000";
const FAUCET = "http://127.0.0.1:9123/v2/gas";
const BEGIN = "# >>> localnet (bun run localnet): test keys, removed when it stops";
const END = "# <<< localnet";

function say(line: string): void {
  process.stdout.write(`${line}\n`);
}

function withoutBlock(text: string): string {
  const start = text.indexOf(BEGIN);
  if (start < 0) return text;
  const end = text.indexOf(END, start);
  return (text.slice(0, start) + (end < 0 ? "" : text.slice(end + END.length + 1))).replace(
    /\n+$/,
    "\n",
  );
}

function writeBlock(lines: string[]): void {
  const base = existsSync(ENV_PATH) ? withoutBlock(readFileSync(ENV_PATH, "utf8")) : "";
  writeFileSync(
    ENV_PATH,
    `${base.endsWith("\n") || base === "" ? base : `${base}\n`}${BEGIN}\n${lines.join("\n")}\n${END}\n`,
  );
}

function clearBlock(): void {
  if (existsSync(ENV_PATH)) writeFileSync(ENV_PATH, withoutBlock(readFileSync(ENV_PATH, "utf8")));
}

async function faucet(body: unknown): Promise<Response> {
  return fetch(FAUCET, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5_000),
  });
}

async function waitForFaucet(): Promise<void> {
  for (let i = 0; i < 90; i++) {
    try {
      await faucet({});
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 2_000));
    }
  }
  throw new Error("the localnet's faucet never came up (see .localnet/sui.log)");
}

if (spawnSync("sui", ["--version"]).status !== 0) {
  say("The Sui CLI isn't on PATH. Install it, then run `bun run localnet` again.");
  process.exit(1);
}
mkdirSync(resolve(HOME, "config"), { recursive: true });
say("Starting a throwaway Sui localnet (its own config in .localnet, never ~/.sui)…");
const log = Bun.file(resolve(HOME, "sui.log")).writer();
const node: ChildProcess = spawn("sui", ["start", "--with-faucet", "--force-regenesis"], {
  env: { ...process.env, SUI_CONFIG_DIR: resolve(HOME, "config") },
  stdio: ["ignore", "pipe", "pipe"],
});
node.stdout?.on("data", (d: Buffer) => log.write(d));
node.stderr?.on("data", (d: Buffer) => log.write(d));

const stop = () => {
  clearBlock();
  node.kill("SIGINT");
  say("\nLocalnet stopped; the localnet lines are out of .env. Restart `bun run dev`.");
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

await waitForFaucet();
const sponsor = new Ed25519Keypair();
const funded = await faucet({ FixedAmountRequest: { recipient: sponsor.toSuiAddress() } });
if (!funded.ok) throw new Error(`the faucet answered ${funded.status}`);
await new Promise((r) => setTimeout(r, 2_000));

const build = spawnSync(
  "sui",
  [
    "move",
    "build",
    "--build-env",
    "testnet",
    "--dump-bytecode-as-base64",
    "--path",
    resolve(ROOT, "packages/move/hunch"),
  ],
  { encoding: "utf8", maxBuffer: 1 << 26 },
);
if (build.status !== 0) throw new Error(`sui move build failed:\n${build.stderr}`);
const client = anchorClient({ SUI_LOCALNET_GRPC: GRPC });
if (!client) throw new Error("no localnet client");
const dump = parseBuildDump(build.stdout);
const receipt = await publishPackage(client, sponsor, dump.modules, dump.dependencies);

writeBlock([
  `SUI_LOCALNET_GRPC=${GRPC}`,
  `SUI_SPONSOR_KEY=${sponsor.getSecretKey()}`,
  `HUNCH_PACKAGE_ID=${receipt.packageId}`,
  "ANCHOR_EVERY_MIN=1",
]);
say(`hunch::anchor published on the localnet: ${receipt.packageId}`);
say("Its lines are in .env. Restart `bun run dev` so the API anchors picks here.");
say("Leave this running. Ctrl-C stops the localnet and takes the lines back out of .env.");
await new Promise(() => {});
