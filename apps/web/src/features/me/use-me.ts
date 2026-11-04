import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { useVisitor } from "@/hooks/use-visitor";
import { authHeaders } from "@/lib/account-store";
import { ApiError, fetchJson } from "@/lib/api";

const REFRESH_MS = 30_000;

const meSchema = z.object({
  address: z.string(),
  delegation: z
    .object({
      id: z.string(),
      until: z.string(),
      perDay: z.number(),
      test: z.boolean(),
      agent: z.string(),
    })
    .nullable(),
  rules: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      version: z.number(),
      stage: z.string(),
      paused: z.boolean(),
      picks: z.number(),
    }),
  ),
  picks: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      team: z.string(),
      confidence: z.number(),
      pickedAt: z.string(),
      lock: z.string(),
      outcome: z.enum(["pending", "right", "wrong"]),
      retracted: z.boolean(),
      ruleId: z.string().nullable(),
    }),
  ),
  notifications: z.array(
    z.object({
      id: z.number(),
      pickId: z.string().nullable(),
      text: z.string(),
      at: z.string(),
      read: z.boolean(),
    }),
  ),
});

export type Me = z.infer<typeof meSchema>;

const undoSchema = z.object({ undone: z.boolean() });
const pauseAllSchema = z.object({ paused: z.number() });

export function useMe(signedIn: boolean) {
  const visitor = useVisitor();
  const [me, setMe] = useState<Me | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [undoing, setUndoing] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!signedIn) {
      setMe(null);
      return;
    }
    try {
      setMe(await fetchJson("/api/me", meSchema, { headers: authHeaders(visitor) }));
      setProblem(null);
    } catch (err) {
      setProblem(err instanceof ApiError ? err.message : "Your record didn't load.");
    }
  }, [signedIn, visitor]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const act = useCallback(
    async (fn: () => Promise<unknown>) => {
      try {
        await fn();
        await load();
      } catch (err) {
        setProblem(err instanceof ApiError ? err.message : "That didn't go through.");
      }
    },
    [load],
  );

  const undo = useCallback(
    async (pickId: string) => {
      setUndoing(pickId);
      await act(() =>
        fetchJson(`/api/picks/${pickId}/undo`, undoSchema, {
          method: "POST",
          headers: authHeaders(visitor),
        }),
      );
      setUndoing(null);
    },
    [act, visitor],
  );

  const pauseAll = useCallback(
    () =>
      act(() =>
        fetchJson("/api/me/pause-all", pauseAllSchema, {
          method: "POST",
          headers: authHeaders(visitor),
        }),
      ),
    [act, visitor],
  );

  return { me, problem, undoing, undo, pauseAll, reload: load };
}
