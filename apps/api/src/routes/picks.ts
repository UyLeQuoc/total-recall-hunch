import { Hono } from "hono";
import { z } from "zod";
import { readAnchor } from "../anchor/chain.ts";
import { usageToday } from "../anchor/meter.ts";
import {
  cachedOnly,
  cachedRead,
  checkPick,
  loadForVerify,
  recoverWith,
  verdict,
} from "../anchor/verify.ts";
import { loadMe } from "../auth/me.ts";
import { manualPick } from "../monitor/manual.ts";
import { retractPick } from "../monitor/signed.ts";
import type { Services } from "../services.ts";
import { callerOf } from "./caller.ts";

const pickId = z.string().regex(/^p_[0-9a-z]{16}$/);
const pickBody = z.object({
  eventId: z.string().regex(/^(nba:\d+|senate:SENATE[A-Z]{2}S?-\d{2})$/),
  side: z.enum(["home", "away"]),
  confidence: z.number().min(0.5).max(0.99),
});

export function pickRoutes(s: Services): Hono {
  const app = new Hono();

  app.post("/picks", async (c) => {
    const body = pickBody.safeParse(await c.req.json().catch(() => null));
    if (!body.success)
      return c.json({ error: "Pick a side with a confidence from 50% to 99%." }, 400);
    const caller = await callerOf(s.db, c);
    if (!caller.address) return c.json({ error: "Sign in and sign the delegation first." }, 401);
    if (!s.agent) return c.json({ error: "Hunch has no agent key to sign picks with yet." }, 503);
    const result = await manualPick(
      s.db,
      s.agent,
      caller.address,
      body.data.eventId,
      body.data.side,
      body.data.confidence,
    );
    if (!result.ok) return c.json({ error: result.reason }, result.status);
    return c.json({ pickId: result.pickId });
  });

  app.post("/picks/:id/undo", async (c) => {
    const id = pickId.safeParse(c.req.param("id"));
    if (!id.success) return c.json({ error: "No pick has that id." }, 404);
    const caller = await callerOf(s.db, c);
    if (!caller.address || !s.agent) return c.json({ error: "Sign in first." }, 401);
    const result = await retractPick(s.db, s.agent, id.data, caller.address);
    if (!result.ok) return c.json({ error: result.reason }, result.status);
    return c.json({ undone: true });
  });

  app.get("/verify/:id", async (c) => {
    const id = pickId.safeParse(c.req.param("id"));
    if (!id.success) return c.json({ error: "No pick has that id." }, 404);
    const summary = await s.db<
      {
        stage: string;
        side: string;
        confidence: number;
        picked_at: Date;
        expires_at: Date;
        outcome: number | null;
        address: string | null;
        rule_id: string | null;
        why: string;
        home: string | null;
        away: string | null;
        title: string | null;
        retracted_at: Date | null;
      }[]
    >`select p.stage, p.side, p.confidence, p.picked_at, p.expires_at, p.outcome, p.address, p.rule_id, p.why,
             p.retracted_at, e.home, e.away, coalesce(e.title, e.away || ' @ ' || e.home) as title
      from picks p left join events e on e.id = p.event_id where p.id = ${id.data}`;
    const row = summary[0];
    if (!row) return c.json({ error: "No pick has that id." }, 404);
    const pick = {
      id: id.data,
      stage: row.stage,
      label: row.title ?? "BTC, 5 minutes",
      team: row.home && row.away ? (row.side === "home" ? row.home : row.away) : row.side,
      confidence: row.confidence,
      pickedAt: row.picked_at.toISOString(),
      lock: row.expires_at.toISOString(),
      outcome: row.outcome === null ? "pending" : row.outcome === 1 ? "right" : "wrong",
      owner: row.address,
      ruleId: row.rule_id,
      why: row.why,
      retracted: row.retracted_at !== null,
    };
    const loaded = await loadForVerify(s.db, id.data);
    if (!loaded) return c.json({ pick, verdict: "practice", checks: [] });
    const sui = s.sui;
    const packageId = s.env.HUNCH_PACKAGE_ID;
    const live = sui && packageId ? (d: string) => readAnchor(sui, d, packageId) : undefined;
    const digest = loaded.anchor?.digest;
    const cached = digest ? await cachedOnly(s.db, digest) : undefined;
    const overBudget = (await usageToday(s.db)).credits >= s.env.DAILY_CREDIT_BUDGET;
    const read = cached
      ? async () => cached
      : live && !overBudget
        ? (d: string) => cachedRead(s.db, d, live)
        : undefined;
    const checks = await checkPick(
      loaded,
      read,
      overBudget ? "Tatum's daily credit budget is spent; the read waits for tomorrow" : undefined,
      recoverWith(overBudget ? undefined : sui),
    );
    return c.json({
      pick,
      verdict: verdict(checks),
      checks,
      hash: loaded.hash,
      anchor: loaded.anchor
        ? { digest: loaded.anchor.digest, network: loaded.anchor.network, root: loaded.anchor.root }
        : null,
    });
  });

  app.get("/me", async (c) => {
    const caller = await callerOf(s.db, c);
    if (!caller.address) return c.json({ error: "Sign in first." }, 401);
    return c.json(await loadMe(s.db, caller.address));
  });

  app.post("/me/notifications/read", async (c) => {
    const caller = await callerOf(s.db, c);
    if (!caller.address) return c.json({ error: "Sign in first." }, 401);
    await s.db`update notifications set read_at = now() where address = ${caller.address} and read_at is null`;
    return c.json({ ok: true });
  });

  return app;
}
