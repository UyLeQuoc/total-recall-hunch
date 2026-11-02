import { Hono } from "hono";
import { z } from "zod";
import { ruleCard } from "../compiler/card.ts";
import type { Db } from "../db/client.ts";
import { currentTick, recentMinutes } from "../ingest/btc.ts";
import { loadPick, startPractice } from "../monitor/practice.ts";
import { ownerOf } from "./owner.ts";

const body = z.object({
  ruleId: z
    .string()
    .regex(/^r_[0-9a-z]{16}$/)
    .optional(),
});
const pickId = z.string().regex(/^p_[0-9a-z]{16}$/);
const LIVE_MINUTES = 40;

export function practiceRoutes(db: Db): Hono {
  const app = new Hono();

  app.post("/practice", async (c) => {
    const parsed = body.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return c.json({ error: "That rule id isn't valid." }, 400);
    const result = await startPractice(
      db,
      ownerOf(c.req.header("x-hunch-visitor")),
      parsed.data.ruleId,
    );
    if (!result.ok) return c.json({ error: result.reason }, 409);
    return c.json({ pick: result.pick, ruleId: result.ruleId, card: ruleCard(result.rule) });
  });

  app.get("/picks/:id", async (c) => {
    const id = pickId.safeParse(c.req.param("id"));
    if (!id.success) return c.json({ error: "No pick has that id." }, 404);
    const pick = await loadPick(db, id.data);
    if (!pick) return c.json({ error: "No pick has that id." }, 404);
    return c.json({ pick });
  });

  app.get("/btc", async (c) => {
    const [tick, minutes] = await Promise.all([currentTick(), recentMinutes()]);
    return c.json({
      price: tick.price,
      at: tick.at.toISOString(),
      minutes: minutes.slice(-LIVE_MINUTES).map((m) => ({
        at: m.startAt.toISOString(),
        open: m.open,
        high: m.high,
        low: m.low,
        close: m.close,
      })),
    });
  });

  return app;
}
