/**
 * Publishes hunch::anchor (packages/move/hunch) and prints HUNCH_PACKAGE_ID. Testnet through Tatum with
 * TATUM_API_KEY_TESTNET and SUI_SPONSOR_KEY, or a localnet when SUI_LOCALNET_GRPC is set (tests only).
 * Never mainnet (ADR-0005, ADR-0010). The key is read from the env and never printed.
 *   bun run anchor:publish
 */
import { spawnSync } from "node:child_process";
import {
  parseBuildDump,
  publishPackage,
  signerFromSuiPrivateKey,
} from "../apps/api/src/anchor/chain.ts";
import { anchorClient } from "../apps/api/src/anchor/sui-client.ts";

const PACKAGE = new URL("../packages/move/hunch", import.meta.url).pathname;

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const env = process.env;
const target = env.SUI_LOCALNET_GRPC ? "localnet" : "testnet";
if (!env.SUI_SPONSOR_KEY)
  fail("SUI_SPONSOR_KEY is not set: it signs the publish and pays its gas.");
if (target === "testnet" && !env.TATUM_API_KEY_TESTNET) {
  fail("TATUM_API_KEY_TESTNET is not set: testnet calls go through Tatum (ADR-0003).");
}
if (target === "testnet" && /mainnet/i.test(env.TATUM_SUI_GRPC_TESTNET ?? "")) {
  fail("TATUM_SUI_GRPC_TESTNET points at mainnet. Hunch never publishes Move to mainnet.");
}

const build = spawnSync(
  "sui",
  ["move", "build", "--build-env", "testnet", "--dump-bytecode-as-base64", "--path", PACKAGE],
  { encoding: "utf8", maxBuffer: 1 << 26 },
);
if (build.status !== 0) fail(`sui move build failed:\n${build.stderr}`);
const dump = parseBuildDump(build.stdout);

const client = anchorClient({
  SUI_LOCALNET_GRPC: env.SUI_LOCALNET_GRPC,
  TATUM_API_KEY_TESTNET: env.TATUM_API_KEY_TESTNET,
});
if (!client) fail("No Sui client: set TATUM_API_KEY_TESTNET, or SUI_LOCALNET_GRPC for a localnet.");

const signer = signerFromSuiPrivateKey(env.SUI_SPONSOR_KEY);
const receipt = await publishPackage(client, signer, dump.modules, dump.dependencies);
process.stdout.write(`published on ${target} in ${receipt.digest}\n`);
process.stdout.write(`HUNCH_PACKAGE_ID=${receipt.packageId}\n`);
