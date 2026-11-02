import type { Logger } from "@hunch/chain";
import type { SuiGrpcClient } from "@mysten/sui/grpc";
import type { AnchorDeps } from "./anchor/batcher.ts";
import { signerFromSuiPrivateKey } from "./anchor/chain.ts";
import { type Agent, agentFrom, keypairFromKey } from "./anchor/keys.ts";
import { anchorClient } from "./anchor/sui-client.ts";
import type { CompilerConfig } from "./compiler/compile.ts";
import type { Db } from "./db/client.ts";
import type { Env } from "./env/schema.ts";
import { type Operator, operatorFrom } from "./memory/walrus.ts";

export interface Services {
  db: Db;
  env: Env;
  log: Logger;
  compiler: CompilerConfig;
  agent: Agent | undefined;
  sui: SuiGrpcClient | undefined;
  anchor: AnchorDeps | undefined;
  memory: Operator | undefined;
}

export function buildServices(db: Db, env: Env, log: Logger): Services {
  const agent = env.HUNCH_AGENT_KEY ? agentFrom(keypairFromKey(env.HUNCH_AGENT_KEY)) : undefined;
  const sui = anchorClient(env);
  const anchor =
    sui && env.SUI_SPONSOR_KEY && env.HUNCH_PACKAGE_ID
      ? {
          client: sui,
          signer: signerFromSuiPrivateKey(env.SUI_SPONSOR_KEY),
          packageId: env.HUNCH_PACKAGE_ID,
          network: env.SUI_LOCALNET_GRPC ? ("localnet" as const) : ("testnet" as const),
          everyMs: env.ANCHOR_EVERY_MIN * 60_000,
        }
      : undefined;
  return {
    db,
    env,
    log,
    compiler: { apiKey: env.OPENROUTER_API_KEY, model: env.LLM_MODEL },
    agent,
    sui,
    anchor,
    memory: operatorFrom(env),
  };
}
