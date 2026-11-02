import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createLogger } from "@hunch/chain";
import { serveStatic } from "hono/bun";
import { createApp } from "./app.ts";
import { connect } from "./db/client.ts";
import { migrate } from "./db/migrate.ts";
import { loadServerEnv } from "./env/load.ts";
import { startLoops } from "./monitor/loop.ts";
import { buildServices } from "./services.ts";

const env = loadServerEnv();
const log = createLogger({ service: "api" });
const db = connect(env.DATABASE_URL);

try {
  await migrate(db);
} catch (err) {
  log.error("can't reach Postgres; run `bun run db:up` from the repo root", {
    reason: String(err),
  });
  process.exit(1);
}

const services = buildServices(db, env, log);
const app = createApp(services);
const webDist = resolve(import.meta.dir, "../../web/dist");
if (existsSync(webDist)) {
  const indexHtml = await Bun.file(resolve(webDist, "index.html")).text();
  app.all("/api/*", (c) => c.json({ error: "No such endpoint." }, 404));
  app.use("/*", serveStatic({ root: webDist }));
  app.get("*", (c) => c.html(indexHtml));
}

startLoops(services);
Bun.serve({ port: env.PORT, fetch: app.fetch, idleTimeout: 60 });
log.info("listening", {
  port: env.PORT,
  model: Boolean(env.OPENROUTER_API_KEY),
  agent: services.agent?.address ?? null,
  anchors: services.anchor?.network ?? "off",
  memory: Boolean(services.memory),
});
