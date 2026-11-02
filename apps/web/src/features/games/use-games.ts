import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { useVisitor } from "@/hooks/use-visitor";
import { authHeaders } from "@/lib/account-store";
import { ApiError, fetchJson } from "@/lib/api";

const REFRESH_MS = 60_000;

const priceSchema = z.object({
  source: z.enum(["books", "polymarket", "kalshi"]),
  homeProb: z.number(),
  at: z.string(),
  fresh: z.boolean(),
  series: z.array(z.number()),
});

const gameSchema = z.object({
  id: z.string(),
  home: z.string(),
  away: z.string(),
  startsAt: z.string(),
  status: z.string(),
  homeScore: z.number().nullable(),
  awayScore: z.number().nullable(),
  prices: z.array(priceSchema),
  gap: z.object({ a: z.string(), b: z.string(), pts: z.number() }).nullable(),
  flagged: z.boolean(),
  call: z
    .object({
      homeProb: z.number(),
      plainProb: z.number(),
      weights: z.array(z.object({ source: z.string(), weight: z.number() })),
      lines: z.array(
        z.object({
          text: z.string(),
          cites: z.object({ memoryId: z.string(), blobId: z.string().nullable() }).nullable(),
        }),
      ),
    })
    .nullable(),
});

const pickSchema = z.object({ pickId: z.string() });

const boardSchema = z.object({ games: z.array(gameSchema) });

export type Game = z.infer<typeof gameSchema>;
export type GamePrice = z.infer<typeof priceSchema>;

export function useGames() {
  const visitor = useVisitor();
  const [games, setGames] = useState<Game[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [pickProblem, setPickProblem] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchJson("/api/games", boardSchema);
      setGames(res.games);
      setProblem(null);
    } catch (err) {
      setProblem(err instanceof ApiError ? err.message : "Tonight's games didn't load.");
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const pick = useCallback(
    async (eventId: string, side: "home" | "away", confidence: number) => {
      setPickProblem(null);
      try {
        const res = await fetchJson("/api/picks", pickSchema, {
          method: "POST",
          headers: authHeaders(visitor),
          body: JSON.stringify({ eventId, side, confidence }),
        });
        setPicked((p) => ({ ...p, [eventId]: res.pickId }));
      } catch (err) {
        setPickProblem(err instanceof ApiError ? err.message : "The pick didn't go through.");
      }
    },
    [visitor],
  );

  return { games, problem, picked, pickProblem, pick, reload: load };
}
