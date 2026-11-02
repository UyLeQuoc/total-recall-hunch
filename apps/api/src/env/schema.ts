import { z } from "zod";

export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8787),
  DATABASE_URL: z.string().url().default("postgres://hunch:hunch@localhost:5437/hunch"),
  OPENROUTER_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default("google/gemini-2.5-flash"),
  TATUM_API_KEY_TESTNET: z.string().optional(),
  TATUM_SUI_GRPC_TESTNET: z.string().optional(),
  SUI_GRPC_FALLBACK_TESTNET: z.string().optional(),
  SUI_LOCALNET_GRPC: z.string().optional(),
  SUI_SPONSOR_KEY: z.string().optional(),
  HUNCH_PACKAGE_ID: z
    .string()
    .regex(/^0x[0-9a-fA-F]{1,64}$/)
    .optional(),
  HUNCH_AGENT_KEY: z
    .string()
    .regex(/^suiprivkey1[0-9a-z]+$/, "expected a suiprivkey1… Ed25519 key")
    .optional(),
  MEMWAL_ACCOUNT_ID: z.string().optional(),
  MEMWAL_PRIVATE_KEY: z.string().optional(),
  MEMWAL_SERVER_URL: z.string().url().default("https://relayer.memory.walrus.xyz"),
  DAILY_CREDIT_BUDGET: z.coerce.number().int().positive().default(2000),
  INGEST: z.enum(["on", "off"]).default("on"),
});

export type Env = z.infer<typeof envSchema>;
