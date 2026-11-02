import { useCallback, useRef, useState } from "react";
import { ApiError, postSse } from "@/lib/api";
import { type Card, hunchEventSchema, type Replay } from "./api";

export type HunchStatus = "idle" | "thinking" | "done";

export interface CompiledRule {
  id: string;
  card: Card;
  compiledBy: string;
  isBtc: boolean;
  kind: "btc" | "nba" | "senate";
}

interface HunchState {
  status: HunchStatus;
  hunch: string;
  steps: string[];
  startedAt: number | null;
  endedAt: number | null;
  rule: CompiledRule | null;
  replay: Replay | null;
  question: string | null;
  problem: string | null;
}

const IDLE: HunchState = {
  status: "idle",
  hunch: "",
  steps: [],
  startedAt: null,
  endedAt: null,
  rule: null,
  replay: null,
  question: null,
  problem: null,
};

export function useHunch(visitor: string) {
  const [state, setState] = useState<HunchState>(IDLE);
  const abort = useRef<AbortController | null>(null);

  const apply = useCallback((data: unknown) => {
    const parsed = hunchEventSchema.safeParse(data);
    if (!parsed.success) return;
    const e = parsed.data;
    setState((s) => {
      switch (e.type) {
        case "step":
          return { ...s, steps: [...s.steps, e.text] };
        case "rule":
          return {
            ...s,
            rule: {
              id: e.id,
              card: e.card,
              compiledBy: e.compiledBy,
              isBtc: e.rule.scope.league[0] === "BTC",
              kind:
                e.rule.scope.league[0] === "BTC"
                  ? "btc"
                  : e.rule.scope.league[0] === "SENATE"
                    ? "senate"
                    : "nba",
            },
          };
        case "replay":
          return { ...s, replay: e.replay };
        case "question":
          return { ...s, question: e.question };
        case "refused":
          return { ...s, problem: e.reason };
        default: {
          const never: never = e;
          return never;
        }
      }
    });
  }, []);

  const ask = useCallback(
    async (hunch: string) => {
      const text = hunch.trim();
      if (text.length < 8) return;
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      setState({ ...IDLE, status: "thinking", hunch: text, startedAt: Date.now() });
      try {
        await postSse(
          "/api/hunches",
          { hunch: text },
          { "x-hunch-visitor": visitor },
          controller.signal,
          apply,
        );
        setState((s) => ({ ...s, status: "done", endedAt: Date.now() }));
      } catch (err) {
        if (controller.signal.aborted) return;
        const problem =
          err instanceof ApiError
            ? err.message
            : "Testing that hunch failed. Try again in a moment.";
        setState((s) => ({ ...s, status: "done", endedAt: Date.now(), problem }));
      }
    },
    [visitor, apply],
  );

  const reset = useCallback(() => {
    abort.current?.abort();
    setState(IDLE);
  }, []);

  return { ...state, ask, reset };
}
