import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { useVisitor } from "@/hooks/use-visitor";
import { authHeaders } from "@/lib/account-store";
import { ApiError, fetchJson } from "@/lib/api";
import { cardSchema, replaySchema } from "@/lib/rule-schemas";

const score = z.object({
  n: z.number(),
  right: z.number(),
  brier: z.number().nullable(),
  against: z.object({ name: z.string(), brier: z.number().nullable(), compared: z.number() }),
  proven: z.boolean(),
});

const ruleSchema = z.object({
  id: z.string(),
  hunch: z.string(),
  compiledBy: z.string(),
  card: cardSchema,
  isBtc: z.boolean(),
  league: z.string(),
  owner: z.string().nullable(),
  mine: z.boolean(),
  paused: z.boolean(),
  replay: replaySchema,
  record: z.object({
    versions: z.array(
      z.object({
        version: z.number(),
        stage: z.string(),
        hunch: z.string().nullable(),
        onRecordAt: z.string().nullable(),
        card: cardSchema,
        onRecord: score,
        practice: score,
        retracted: z.number(),
        open: z.number(),
      }),
    ),
    picks: z.array(
      z.object({
        id: z.string(),
        version: z.number().nullable(),
        stage: z.string(),
        label: z.string(),
        side: z.string(),
        confidence: z.number(),
        pickedAt: z.string(),
        lock: z.string(),
        outcome: z.enum(["pending", "right", "wrong"]),
        retracted: z.boolean(),
        anchored: z.boolean(),
      }),
    ),
    fires: z.array(
      z.object({
        version: z.number(),
        eventId: z.string(),
        at: z.string(),
        fired: z.boolean(),
        why: z.array(z.string()),
      }),
    ),
  }),
});

export type RuleView = z.infer<typeof ruleSchema>;
export type VersionView = RuleView["record"]["versions"][number];

export function useRule(id: string) {
  const visitor = useVisitor();
  const [rule, setRule] = useState<RuleView | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRule(await fetchJson(`/api/rules/${id}`, ruleSchema, { headers: authHeaders(visitor) }));
      setProblem(null);
    } catch (err) {
      setProblem(err instanceof ApiError ? err.message : "The rule didn't load.");
    }
  }, [id, visitor]);

  useEffect(() => {
    void load();
  }, [load]);

  return { rule, problem, reload: load };
}
