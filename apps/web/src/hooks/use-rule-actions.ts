import { useCallback, useState } from "react";
import { z } from "zod";
import { authHeaders } from "@/lib/account-store";
import { ApiError, fetchJson } from "@/lib/api";
import { useVisitor } from "./use-visitor";

const recordSchema = z.object({ version: z.number() });
const pauseSchema = z.object({ paused: z.boolean() });
const versionSchema = z.object({ version: z.number() });

export function useRuleActions(onDone?: () => void) {
  const visitor = useVisitor();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const run = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
      setBusy(true);
      setProblem(null);
      try {
        const out = await fn();
        onDone?.();
        return out;
      } catch (err) {
        setProblem(err instanceof ApiError ? err.message : "That didn't go through.");
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [onDone],
  );

  const putOnRecord = useCallback(
    (ruleId: string) =>
      run(() =>
        fetchJson(`/api/rules/${ruleId}/record`, recordSchema, {
          method: "POST",
          headers: authHeaders(visitor),
        }),
      ),
    [run, visitor],
  );

  const setPaused = useCallback(
    (ruleId: string, paused: boolean) =>
      run(() =>
        fetchJson(`/api/rules/${ruleId}/pause`, pauseSchema, {
          method: "POST",
          headers: authHeaders(visitor),
          body: JSON.stringify({ paused }),
        }),
      ),
    [run, visitor],
  );

  const addVersion = useCallback(
    (ruleId: string, hunch: string) =>
      run(() =>
        fetchJson(`/api/rules/${ruleId}/versions`, versionSchema, {
          method: "POST",
          headers: authHeaders(visitor),
          body: JSON.stringify({ hunch }),
        }),
      ),
    [run, visitor],
  );

  return { busy, problem, putOnRecord, setPaused, addVersion };
}
