import { useCallback, useEffect, useState } from "react";
import { useNow } from "@/hooks/use-frame";
import { ApiError, fetchJson } from "@/lib/api";
import {
  type Btc,
  btcSchema,
  type Card,
  type Pick,
  pickResponseSchema,
  practiceSchema,
} from "./api";

const PICK_POLL_MS = 3_000;
const BTC_POLL_MS = 5_000;

type PracticeStatus = "idle" | "starting" | "live" | "scored";

export function usePractice(visitor: string) {
  const [status, setStatus] = useState<PracticeStatus>("idle");
  const [pick, setPick] = useState<Pick | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [btc, setBtc] = useState<Btc | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const now = useNow(1_000, status === "live");

  const start = useCallback(
    async (ruleId?: string) => {
      setStatus("starting");
      setProblem(null);
      try {
        const res = await fetchJson("/api/practice", practiceSchema, {
          method: "POST",
          headers: { "content-type": "application/json", "x-hunch-visitor": visitor },
          body: JSON.stringify(ruleId ? { ruleId } : {}),
        });
        setPick(res.pick);
        setCard(res.card);
        setStatus("live");
      } catch (err) {
        setProblem(err instanceof ApiError ? err.message : "The practice pick didn't start.");
        setStatus("idle");
      }
    },
    [visitor],
  );

  const pickId = pick?.id;
  useEffect(() => {
    if (status !== "live" || !pickId) return;
    let stop = false;
    const poll = async () => {
      try {
        const res = await fetchJson(`/api/picks/${pickId}`, pickResponseSchema);
        if (stop) return;
        setPick(res.pick);
        if (res.pick.outcome !== "pending") setStatus("scored");
      } catch (err) {
        if (!stop)
          setProblem(err instanceof ApiError ? err.message : "Lost the pick for a moment.");
      }
    };
    const id = setInterval(() => void poll(), PICK_POLL_MS);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [status, pickId]);

  useEffect(() => {
    if (status !== "live") return;
    let stop = false;
    const load = async () => {
      try {
        const res = await fetchJson("/api/btc", btcSchema);
        if (!stop) setBtc(res);
      } catch (err) {
        if (!stop) setProblem(err instanceof ApiError ? err.message : "BTC prices are late.");
      }
    };
    void load();
    const id = setInterval(() => void load(), BTC_POLL_MS);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [status]);

  const secondsLeft = pick ? Math.max(Math.ceil((Date.parse(pick.expiresAt) - now) / 1000), 0) : 0;
  return { status, pick, card, btc, problem, secondsLeft, start };
}
