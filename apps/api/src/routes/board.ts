import { Hono } from "hono";
import { loadBoard } from "../ingest/board.ts";
import { loadHealth } from "../ingest/health.ts";
import { newestLines } from "../memory/queue.ts";
import { loadPastGames } from "../monitor/history.ts";
import { currentTrust } from "../score/trust.ts";
import { learningCurve, sourceObservations, voiceStats } from "../score/voices.ts";
import type { Services } from "../services.ts";

const LEARNING_DAYS = 30;

export function boardRoutes(s: Services): Hono {
  const app = new Hono();

  app.get("/games", async (c) => {
    const trust = await currentTrust(s.db, s.memory, s.log);
    return c.json({ games: await loadBoard(s.db, trust) });
  });

  app.get("/learning", async (c) => {
    const now = new Date();
    const games = await loadPastGames(
      s.db,
      new Date(now.getTime() - LEARNING_DAYS * 86_400_000),
      now,
    );
    const trust = await currentTrust(s.db, s.memory, s.log);
    const lines = await newestLines(s.db, "trust:public", "TRUST · ");
    return c.json({
      curve: learningCurve(games),
      voices: voiceStats(sourceObservations(games)),
      trust: [...trust.values()],
      memories: lines.slice(0, 12),
    });
  });

  app.get("/status", async (c) => c.json(await loadHealth(s)));

  return app;
}
