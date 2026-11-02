import { createLocalSuiClient, createTatumSuiClient, tatumSuiOptionsFromEnv } from "@hunch/chain";
import type { SuiGrpcClient } from "@mysten/sui/grpc";

export interface AnchorClientEnv {
  SUI_LOCALNET_GRPC?: string;
  TATUM_API_KEY_TESTNET?: string;
}

export function anchorClient(env: AnchorClientEnv): SuiGrpcClient | undefined {
  if (env.SUI_LOCALNET_GRPC) return createLocalSuiClient(env.SUI_LOCALNET_GRPC);
  if (!env.TATUM_API_KEY_TESTNET) return undefined;
  return createTatumSuiClient(tatumSuiOptionsFromEnv("testnet", { ...process.env, ...env }));
}
