import { Hono } from "hono";
import { z } from "zod";
import { acceptDelegation, activeDelegation, challenge } from "../auth/service.ts";
import type { Services } from "../services.ts";
import { callerOf } from "./caller.ts";

const address = z.string().regex(/^0x[0-9a-fA-F]{64}$/);
const delegateBody = z.object({
  message: z.string().min(20).max(1000),
  signature: z.string().min(20).max(5000),
  test: z.boolean().default(false),
  visitor: z.string().uuid().optional(),
});
const NO_AGENT =
  "Hunch has no agent key yet (HUNCH_AGENT_KEY), so it can't sign picks. Run `bun run keys:dev`.";

export function authRoutes(s: Services): Hono {
  const app = new Hono();

  app.get("/auth/challenge", async (c) => {
    if (!s.agent) return c.json({ error: NO_AGENT }, 503);
    const parsed = address.safeParse(c.req.query("address"));
    if (!parsed.success) return c.json({ error: "That isn't a Sui address." }, 400);
    return c.json(await challenge(s.db, parsed.data, s.agent.address));
  });

  app.post("/auth/delegate", async (c) => {
    if (!s.agent) return c.json({ error: NO_AGENT }, 503);
    const parsed = delegateBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success)
      return c.json({ error: "Send the signed message and its signature." }, 400);
    const result = await acceptDelegation(s.db, parsed.data, s.agent.address, s.sui);
    if (!result.ok) return c.json({ error: result.reason }, 401);
    s.log.info("delegation signed", {
      delegation: result.delegation.id,
      test: result.delegation.test,
    });
    return c.json({ token: result.token, delegation: result.delegation });
  });

  app.get("/auth/me", async (c) => {
    const caller = await callerOf(s.db, c);
    if (!caller.address) return c.json({ address: null, delegation: null });
    const delegation = await activeDelegation(s.db, caller.address);
    return c.json({ address: caller.address, delegation: delegation ?? null });
  });

  return app;
}
