import { Hono } from "hono";
import { authRoutes } from "./routes/auth.ts";
import { boardRoutes } from "./routes/board.ts";
import { hunchRoutes } from "./routes/hunches.ts";
import { pickRoutes } from "./routes/picks.ts";
import { practiceRoutes } from "./routes/practice.ts";
import { ruleRoutes } from "./routes/rules.ts";
import type { Services } from "./services.ts";

export function createApp(s: Services): Hono {
  const app = new Hono();
  app.onError((err, c) => {
    s.log.error("request failed", { path: c.req.path, reason: String(err) });
    return c.json({ error: "Hunch hit an error. Try again in a moment." }, 500);
  });
  app.get("/api/health", (c) => c.json({ ok: true }));
  app.route("/api", hunchRoutes(s));
  app.route("/api", ruleRoutes(s));
  app.route("/api", practiceRoutes(s.db));
  app.route("/api", pickRoutes(s));
  app.route("/api", authRoutes(s));
  app.route("/api", boardRoutes(s));
  return app;
}
