import { Hono } from "hono";
import { z } from "zod";
import { ruleCard } from "../compiler/card.ts";
import { addVersion, ownsRule, pauseAll, putOnRecord, setPaused } from "../compiler/lifecycle.ts";
import { isBtcRule } from "../compiler/rule.ts";
import { replayRule } from "../compiler/run.ts";
import { loadRule } from "../compiler/store.ts";
import { loadRuleRecord } from "../score/record.ts";
import type { Services } from "../services.ts";
import { callerOf } from "./caller.ts";

const ruleId = z.string().regex(/^r_[0-9a-z]{16}$/);
const pauseBody = z.object({ paused: z.boolean() });
const versionBody = z.object({ hunch: z.string().trim().min(8).max(400) });

export function ruleRoutes(s: Services): Hono {
  const app = new Hono();

  app.get("/rules/:id", async (c) => {
    const id = ruleId.safeParse(c.req.param("id"));
    if (!id.success) return c.json({ error: "No rule has that id." }, 404);
    const stored = await loadRule(s.db, id.data);
    if (!stored) return c.json({ error: "No rule has that id." }, 404);
    const caller = await callerOf(s.db, c);
    const meta = await s.db<{ owner: string; paused: boolean }[]>`
      select owner, paused from rules where id = ${id.data}`;
    const owner = meta[0]?.owner ?? "";
    return c.json({
      id: stored.id,
      hunch: stored.hunch,
      compiledBy: stored.compiledBy,
      card: ruleCard(stored.rule),
      isBtc: isBtcRule(stored.rule),
      league: stored.rule.scope.league[0],
      owner: owner.startsWith("sui:") ? owner.slice(4) : null,
      mine: caller.owners.includes(owner),
      paused: meta[0]?.paused ?? false,
      replay: await replayRule(s.db, stored.rule, new Date()),
      record: await loadRuleRecord(s.db, id.data),
    });
  });

  app.post("/rules/:id/record", async (c) => {
    const id = ruleId.safeParse(c.req.param("id"));
    if (!id.success) return c.json({ error: "No rule has that id." }, 404);
    const caller = await callerOf(s.db, c);
    if (!caller.address) return c.json({ error: "Sign in and sign the delegation first." }, 401);
    const result = await putOnRecord(
      s.db,
      id.data,
      caller.address,
      caller.owners,
      s.agent?.address,
    );
    if (!result.ok) return c.json({ error: result.reason }, result.status);
    return c.json(result.value);
  });

  app.post("/rules/:id/pause", async (c) => {
    const id = ruleId.safeParse(c.req.param("id"));
    const body = pauseBody.safeParse(await c.req.json().catch(() => null));
    if (!id.success || !body.success)
      return c.json({ error: "Send { paused: true | false }." }, 400);
    const caller = await callerOf(s.db, c);
    const result = await setPaused(s.db, id.data, caller.owners, body.data.paused);
    if (!result.ok) return c.json({ error: result.reason }, result.status);
    return c.json(result.value);
  });

  app.post("/rules/:id/versions", async (c) => {
    const id = ruleId.safeParse(c.req.param("id"));
    const body = versionBody.safeParse(await c.req.json().catch(() => null));
    if (!id.success || !body.success)
      return c.json({ error: "Write the new wording (8 to 400 characters)." }, 400);
    const caller = await callerOf(s.db, c);
    if (!(await ownsRule(s.db, id.data, caller.owners)))
      return c.json({ error: "That isn't your rule." }, 403);
    const result = await addVersion(
      s.db,
      id.data,
      caller.owners,
      body.data.hunch,
      s.compiler,
      (reason) => s.log.warn("model compile failed, using patterns", { reason }),
    );
    if (!result.ok) return c.json({ error: result.reason }, result.status);
    return c.json({ version: result.value.version, card: ruleCard(result.value.rule) });
  });

  app.post("/me/pause-all", async (c) => {
    const caller = await callerOf(s.db, c);
    if (!caller.address) return c.json({ error: "Sign in first." }, 401);
    return c.json({ paused: await pauseAll(s.db, caller.address) });
  });

  return app;
}
