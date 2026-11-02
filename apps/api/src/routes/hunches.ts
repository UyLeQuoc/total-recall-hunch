import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { runHunch } from "../compiler/run.ts";
import type { Services } from "../services.ts";
import { callerOf } from "./caller.ts";

const body = z.object({ hunch: z.string().trim().min(8).max(400) });

export function hunchRoutes(s: Services): Hono {
  const app = new Hono();

  app.post("/hunches", async (c) => {
    const parsed = body.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: "Write the hunch in a sentence or two (8 to 400 characters)." }, 400);
    }
    const caller = await callerOf(s.db, c);
    const owner = caller.owners.at(-1) ?? "visitor:anonymous";
    return streamSSE(c, async (stream) => {
      try {
        await runHunch(
          s.db,
          s.compiler,
          owner,
          parsed.data.hunch,
          (e) => stream.writeSSE({ event: e.type, data: JSON.stringify(e) }),
          (reason) => s.log.warn("model compile failed, using patterns", { reason }),
        );
      } catch (err) {
        s.log.error("hunch failed", { reason: String(err) });
        await stream.writeSSE({
          event: "refused",
          data: JSON.stringify({
            type: "refused",
            reason: "Something broke while testing that hunch. Try again in a moment.",
          }),
        });
      }
      await stream.writeSSE({ event: "done", data: "{}" });
    });
  });

  return app;
}
