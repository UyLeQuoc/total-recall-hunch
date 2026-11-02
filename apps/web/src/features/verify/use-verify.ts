import { useEffect, useState } from "react";
import { z } from "zod";
import { ApiError, fetchJson } from "@/lib/api";

const verifySchema = z.object({
  pick: z.object({
    id: z.string(),
    stage: z.string(),
    label: z.string(),
    team: z.string(),
    confidence: z.number(),
    pickedAt: z.string(),
    lock: z.string(),
    outcome: z.string(),
    owner: z.string().nullable(),
    ruleId: z.string().nullable(),
    why: z.string(),
    retracted: z.boolean(),
  }),
  verdict: z.enum(["verified", "pending", "failed", "practice"]),
  checks: z.array(z.object({ name: z.string(), ok: z.boolean().nullable(), detail: z.string() })),
  hash: z.string().optional(),
  anchor: z
    .object({ digest: z.string().nullable(), network: z.string(), root: z.string() })
    .nullable()
    .optional(),
});

export type Verification = z.infer<typeof verifySchema>;

export function useVerify(id: string) {
  const [data, setData] = useState<Verification | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => {
    let stop = false;
    setData(null);
    fetchJson(`/api/verify/${id}`, verifySchema)
      .then((d) => {
        if (!stop) setData(d);
      })
      .catch((err: unknown) => {
        if (!stop) setProblem(err instanceof ApiError ? err.message : "The proof didn't load.");
      });
    return () => {
      stop = true;
    };
  }, [id]);
  return { data, problem };
}
