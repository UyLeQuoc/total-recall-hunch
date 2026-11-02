export const MIN_PROBABILITY = 0.15;
export const MAX_PROBABILITY = 0.85;
export const MIN_PREMIUM_USDC = 1;
export const LAST_ORDER_MS = 45_000;

export interface MarketWindow {
  id: string;
  expiryMs: bigint;
  mintPaused: boolean;
  referencePrice: number | null;
}

export interface SpikeArgs {
  order: boolean;
  side: "up" | "down";
  amount: number;
  network: string;
}

export type ArgsResult = { ok: true; args: SpikeArgs } | { ok: false; reason: string };

export function parseArgs(argv: string[]): ArgsResult {
  let order = false;
  let side: "up" | "down" = "up";
  let amount = MIN_PREMIUM_USDC;
  let network = "testnet";
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--order") order = true;
    else if (arg === "--side" && (next === "up" || next === "down")) {
      side = next;
      i++;
    } else if (arg === "--amount" && next !== undefined) {
      amount = Number(next);
      i++;
    } else if (arg === "--network" && next !== undefined) {
      network = next;
      i++;
    } else {
      return {
        ok: false,
        reason: `Unknown argument: ${arg ?? ""}. Use --order, --side up|down, --amount <usdc>.`,
      };
    }
  }
  if (network !== "testnet") {
    return {
      ok: false,
      reason: "The Predict spike runs on Sui testnet only. Hunch never trades on mainnet.",
    };
  }
  if (!Number.isFinite(amount) || amount < MIN_PREMIUM_USDC) {
    return { ok: false, reason: `Predict takes a premium of at least ${MIN_PREMIUM_USDC} USDC.` };
  }
  return { ok: true, args: { order, side, amount, network } };
}

export function liveWindows(markets: MarketWindow[], nowMs: number): MarketWindow[] {
  return markets
    .filter((m) => !m.mintPaused && m.referencePrice !== null && Number(m.expiryMs) > nowMs)
    .sort((a, b) => Number(a.expiryMs - b.expiryMs));
}

export function windowForOrder(markets: MarketWindow[], nowMs: number): MarketWindow | undefined {
  return liveWindows(markets, nowMs).find((m) => Number(m.expiryMs) - nowMs > LAST_ORDER_MS);
}

export function withinLimits(pricePerContract: number): boolean {
  return pricePerContract >= MIN_PROBABILITY && pricePerContract <= MAX_PROBABILITY;
}

export function untilExpiry(expiryMs: bigint, nowMs: number): string {
  const s = Math.max(Math.round((Number(expiryMs) - nowMs) / 1000), 0);
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

export function settledSide(settlement: number, strike: number): "up" | "down" {
  return settlement > strike ? "up" : "down";
}
