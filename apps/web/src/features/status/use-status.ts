import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { ApiError, fetchJson } from "@/lib/api";

const REFRESH_MS = 30_000;

const statusSchema = z.object({
  now: z.string(),
  sources: z.array(
    z.object({ source: z.string(), last: z.string().nullable(), hourly: z.array(z.number()) }),
  ),
  backfill: z.object({ games: z.number(), withPrices: z.number(), btcCandles: z.number() }),
  tatum: z.object({
    calls: z.record(z.string(), z.number()),
    credits: z.number(),
    budget: z.number(),
    fallback: z.boolean(),
  }),
  keys: z.object({
    model: z.boolean(),
    tatum: z.boolean(),
    memory: z.boolean(),
    sponsor: z.boolean(),
    anchor: z.boolean(),
    agent: z.boolean(),
    odds: z.boolean(),
  }),
  network: z.string(),
  agent: z.string().nullable(),
  anchors: z.object({
    pendingPicks: z.number(),
    batches: z.number(),
    last: z
      .object({
        digest: z.string().nullable(),
        status: z.string(),
        count: z.number(),
        at: z.string(),
      })
      .nullable(),
  }),
  memories: z.record(z.string(), z.number()),
  onRecord: z.object({ rules: z.number(), picks: z.number(), delegations: z.number() }),
  oddsApi: z.object({
    key: z.boolean(),
    calls: z.number(),
    cap: z.number(),
    remaining: z.number().nullable(),
    books: z.array(z.string()),
  }),
});

export type Status = z.infer<typeof statusSchema>;

export function useStatus() {
  const [status, setStatus] = useState<Status | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await fetchJson("/api/status", statusSchema));
      setProblem(null);
    } catch (err) {
      setProblem(err instanceof ApiError ? err.message : "The status didn't load.");
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  return { status, problem };
}
