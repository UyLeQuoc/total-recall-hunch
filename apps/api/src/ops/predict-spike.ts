import { createTatumSuiClient, tatumSuiOptionsFromEnv } from "@hunch/chain";
import { loadEnv, withoutBlanks } from "@hunch/memory";
import {
  describePredictError,
  getDeployment,
  type MarketDescriptor,
  PredictClient,
  PredictMoveError,
  PredictPreflightError,
} from "@mysten/deepbook-v3/predict";
import { z } from "zod";
import { signerFromSuiPrivateKey } from "../anchor/chain.ts";
import {
  liveWindows,
  parseArgs,
  settledSide,
  untilExpiry,
  windowForOrder,
  withinLimits,
} from "./predict.ts";

const UNDERLYING = "BTC";
const LISTED = 6;
const FILL_TIMEOUT_MS = 120_000;
const SETTLE_POLL_MS = 5_000;
const SETTLE_GRACE_MS = 120_000;

const envSchema = z.object({
  TATUM_API_KEY_TESTNET: z.string().optional(),
  TATUM_SUI_GRPC_TESTNET: z.string().url().optional(),
  SUI_SPONSOR_KEY: z.string().optional(),
});

function say(line: string): void {
  process.stdout.write(`${line}\n`);
}

function stop(line: string): never {
  process.stderr.write(`${line}\n`);
  process.exit(1);
}

function explain(err: unknown): string {
  if (err instanceof PredictPreflightError)
    return `Predict refused the order (${err.code}): ${err.message}`;
  if (err instanceof PredictMoveError) return describePredictError(err) ?? err.message;
  return err instanceof Error ? err.message : String(err);
}

const parsedArgs = parseArgs(process.argv.slice(2));
if (!parsedArgs.ok) stop(parsedArgs.reason);
const args = parsedArgs.args;

loadEnv();
const env = envSchema.parse(withoutBlanks(process.env));
if (!env.TATUM_API_KEY_TESTNET) {
  stop(
    "TATUM_API_KEY_TESTNET isn't set. Every Sui call goes through Tatum (ADR-0003); add the key to .env.",
  );
}
if (env.TATUM_SUI_GRPC_TESTNET && !env.TATUM_SUI_GRPC_TESTNET.includes("testnet")) {
  stop("TATUM_SUI_GRPC_TESTNET doesn't point at testnet. The spike runs on Sui testnet only.");
}

const client = createTatumSuiClient(tatumSuiOptionsFromEnv("testnet", withoutBlanks(process.env)));
const predict = new PredictClient({ network: "testnet", client });
const deployment = getDeployment("testnet");
say(
  `Predict on ${deployment.network} · deployment ${deployment.deployment} · source ${deployment.sourceCommit.slice(0, 10)}`,
);
say(`execution mode: ${await predict.read.executionMode()}`);

const now = Date.now();
const windows = liveWindows(await predict.read.markets(), now);
if (windows.length === 0) stop("No open BTC window right now. Try again in a minute.");
say(
  `\n${UNDERLYING}/USD windows, soonest first (Sui's own price that BTC ends above the window's anchor):`,
);
for (const w of windows.slice(0, LISTED)) {
  try {
    const price = await predict.read.price({
      underlying: UNDERLYING,
      expiryMs: w.expiryMs,
      marketId: w.id,
      strike: "reference",
    });
    say(
      `  ${w.id.slice(0, 10)}… expires in ${untilExpiry(w.expiryMs, now)} · anchor $${w.referencePrice?.toLocaleString("en-US")} · up ${(price.up * 100).toFixed(1)}% · down ${(price.down * 100).toFixed(1)}%`,
    );
  } catch (err) {
    say(
      `  ${w.id.slice(0, 10)}… expires in ${untilExpiry(w.expiryMs, now)} · no live price: ${explain(err)}`,
    );
  }
}

if (!args.order) {
  say("\nDry run: nothing was sent. Pass --order to queue one order on testnet.");
  process.exit(0);
}

if (!env.SUI_SPONSOR_KEY) stop("SUI_SPONSOR_KEY isn't set: the order needs a funded testnet key.");
const signer = signerFromSuiPrivateKey(env.SUI_SPONSOR_KEY);
const owner = signer.toSuiAddress();

let balance: number;
try {
  balance = await predict.read.balance(owner);
} catch (err) {
  stop(
    `This key has no Predict account yet (${explain(err)}). Request test USDC, then deposit it with the SDK's tx.deposit.`,
  );
}
if (balance < args.amount) {
  stop(
    `The Predict account holds ${balance} test USDC; the order needs ${args.amount} plus the order fee. Request test USDC first.`,
  );
}

const window = windowForOrder(windows, Date.now());
if (!window)
  stop("Every open window is too close to expiry to queue an order. Try again in a minute.");
const market: MarketDescriptor = {
  underlying: UNDERLYING,
  expiryMs: window.expiryMs,
  marketId: window.id,
  side: args.side,
  strike: "reference",
};
const coordinates = { underlying: UNDERLYING, expiryMs: window.expiryMs, marketId: window.id };

const plan = await predict.read.planMint(owner, market, {
  amount: args.amount,
  orderFee: "exclusive",
});
say(
  `\nplan · ${args.side.toUpperCase()} at the anchor · ${plan.pricePerContract.toFixed(3)} per contract · pays ${plan.potentialPayout.toFixed(2)} USDC if right · debit ${plan.totalDebit.toFixed(2)} USDC (fee ${plan.orderFee.toFixed(2)})`,
);
if (!withinLimits(plan.pricePerContract)) {
  stop(
    `Predict fills only between 0.15 and 0.85; this window prices ${args.side} at ${plan.pricePerContract.toFixed(3)}. Try the other side or the next window.`,
  );
}
if (!plan.accepting)
  stop(`Predict wouldn't take this order now: ${plan.refusal ?? "unknown reason"}.`);

let digest: string;
let recordId: bigint;
try {
  const { transaction } = await predict.tx.enqueuePlan(owner, market, plan);
  const result = await client.signAndExecuteTransaction({
    transaction,
    signer,
    include: { effects: true, events: true },
  });
  if (result.$kind === "FailedTransaction") {
    const status = result.FailedTransaction.status;
    stop(`The enqueue failed on chain: ${status.success ? "unknown" : status.error.message}`);
  }
  digest = result.Transaction.digest;
  await client.waitForTransaction({ digest });
  recordId = predict.decode.enqueue({ events: result.Transaction.events }).recordId;
} catch (err) {
  stop(explain(err));
}
say(`queued · tx ${digest} · record ${recordId}`);

const outcome = await predict.read.waitForOutcome(coordinates, recordId, {
  timeoutMs: FILL_TIMEOUT_MS,
});
say(`fill · ${outcome.outcome}`);
if (outcome.outcome !== "filled") stop("The order didn't fill; nothing more to settle.");

const deadline = Number(window.expiryMs) + SETTLE_GRACE_MS;
for (;;) {
  const settlement = await predict.read.settlement(coordinates);
  if (settlement.settled && settlement.settlementPrice !== null) {
    const strike = window.referencePrice ?? settlement.settlementPrice;
    const won = settledSide(settlement.settlementPrice, strike) === args.side;
    say(
      `settled · $${settlement.settlementPrice.toLocaleString("en-US")} against the anchor $${strike.toLocaleString("en-US")} · ${won ? "paid" : "expired worthless"}`,
    );
    break;
  }
  if (Date.now() > deadline)
    stop("The market hasn't settled two minutes after expiry. Check it again later.");
  await new Promise((r) => setTimeout(r, SETTLE_POLL_MS));
}
