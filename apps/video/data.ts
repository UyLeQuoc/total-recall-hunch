/**
 * Measures everything the film puts on screen, from the live API and the test suite, into
 * apps/video/.build/data.json. Compiling the demo hunch saves a practice draft, as any visitor's would;
 * nothing else is written.
 *   bun data.ts
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stripVTControlCharacters } from "node:util";
import { z } from "zod";

const ROOT = new URL("../..", import.meta.url).pathname;
const OUT = join(ROOT, "apps", "video", ".build");
const API = process.env.HUNCH_API ?? "https://hunch-api-production-da65.up.railway.app/api";
const HUNCH =
  "When the books and Polymarket disagree by 1+ points on an NBA game, the books are right.";
const PICK = "p_0q47076d2o6c5t5e";

const cite = z.object({ voice: z.string(), n: z.number(), brier: z.number(), blobId: z.string() });
const price = z.object({ source: z.string(), homeProb: z.number(), fresh: z.boolean() });
const game = z.object({
  id: z.string(),
  league: z.string(),
  title: z.string(),
  home: z.string(),
  away: z.string(),
  homeName: z.string(),
  awayName: z.string(),
  startsAt: z.string(),
  status: z.string(),
  prices: z.array(price),
  books: z.array(z.object({ book: z.string(), homeProb: z.number() })),
  call: z
    .object({
      homeProb: z.number(),
      lines: z.array(z.object({ text: z.string(), cites: cite.nullable().optional() })),
    })
    .nullable(),
});
const games = z.object({ games: z.array(game) });
const learning = z.object({
  curve: z.array(
    z.object({ n: z.number(), call: z.number(), plain: z.number(), books: z.number() }),
  ),
  voices: z.array(
    z.object({
      voice: z.string(),
      ctx: z.string(),
      n: z.number(),
      brier: z.number(),
      hit: z.number(),
    }),
  ),
  memories: z.array(
    z.object({
      namespace: z.string(),
      text: z.string(),
      status: z.string(),
      blobId: z.string().nullable(),
    }),
  ),
});
const status = z.object({
  tatum: z.object({
    calls: z.record(z.string(), z.number()),
    credits: z.number(),
    budget: z.number(),
  }),
  anchors: z.object({ batches: z.number() }),
  memories: z.object({ written: z.number() }),
  oddsApi: z.object({ books: z.array(z.string()) }),
  backfill: z.object({ games: z.number(), btcCandles: z.number() }),
});
const verify = z.object({
  pick: z.object({
    label: z.string(),
    team: z.string(),
    confidence: z.number(),
    outcome: z.string(),
  }),
  verdict: z.string(),
  checks: z.array(z.object({ name: z.string(), ok: z.boolean(), detail: z.string() })),
  hash: z.string(),
  anchor: z.object({ digest: z.string(), network: z.string() }),
});
const ruleEvent = z.object({
  card: z.object({
    title: z.string(),
    when: z.array(z.string()),
    then: z.array(z.string()),
    against: z.string(),
    limits: z.string(),
  }),
  compiledBy: z.string(),
});
const replayEvent = z.object({
  replay: z.object({
    considered: z.number(),
    fires: z.number(),
    right: z.number(),
    brier: z.number().nullable(),
    against: z.object({ name: z.string(), brier: z.number().nullable() }),
    days: z.array(z.object({ day: z.string(), fires: z.number(), right: z.number() })),
  }),
});

async function get<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const res = await fetch(`${API}${path}`, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`${path} answered ${res.status}`);
  return schema.parse(await res.json());
}

async function compile(hunch: string) {
  const res = await fetch(`${API}/hunches`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ hunch }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`/hunches answered ${res.status}`);
  const events = new Map<string, unknown>();
  const steps: string[] = [];
  let event = "";
  for (const line of (await res.text()).split("\n")) {
    if (line.startsWith("event: ")) event = line.slice(7).trim();
    if (!line.startsWith("data: ")) continue;
    const data: unknown = JSON.parse(line.slice(6));
    if (event === "step") steps.push(z.object({ text: z.string() }).parse(data).text);
    else events.set(event, data);
  }
  return {
    text: hunch,
    steps,
    rule: ruleEvent.parse(events.get("rule")),
    replay: replayEvent.parse(events.get("replay")).replay,
  };
}

function testCount(): number {
  const run = spawnSync("bun", ["run", "test"], { cwd: ROOT, encoding: "utf8" });
  const text = stripVTControlCharacters(`${run.stdout}\n${run.stderr}`);
  if (run.status !== 0)
    throw new Error("the test suite failed; fix it before filming numbers from it");
  return [...text.matchAll(/Tests\s+(\d+) passed/g)].reduce((sum, m) => sum + Number(m[1]), 0);
}

const spread = (g: z.infer<typeof game>) => {
  const ps = g.prices.filter((p) => p.fresh).map((p) => p.homeProb);
  return ps.length < 3 ? -1 : Math.max(...ps) - Math.min(...ps);
};

const [board, learned, live, proof, hunch] = await Promise.all([
  get("/games", games),
  get("/learning", learning),
  get("/status", status),
  get(`/verify/${PICK}`, verify),
  compile(HUNCH),
]);
const nba = board.games.filter((g) => g.league === "NBA" && g.status === "pre");
const featured = [...nba].sort((a, b) => spread(b) - spread(a))[0];
if (!featured) throw new Error("no NBA game ahead with three fresh prices");
const cites = new Map<string, z.infer<typeof cite>>();
for (const g of board.games)
  for (const l of g.call?.lines ?? []) if (l.cites) cites.set(`${l.cites.voice}`, l.cites);

const data = {
  measuredAt: new Date().toISOString(),
  hunch,
  featured,
  cites: [...cites.values()],
  curve: learned.curve,
  voices: learned.voices,
  memoryLines: learned.memories.filter((m) => m.status === "written" && m.blobId),
  status: {
    memoriesWritten: live.memories.written,
    tatumCalls: Object.values(live.tatum.calls).reduce((a, b) => a + b, 0),
    tatumMethods: Object.keys(live.tatum.calls),
    tatumCredits: live.tatum.credits,
    tatumBudget: live.tatum.budget,
    anchorBatches: live.anchors.batches,
    books: live.oddsApi.books,
    backfillGames: live.backfill.games,
    btcCandles: live.backfill.btcCandles,
  },
  proof: { id: PICK, ...proof },
  tests: testCount(),
};
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "data.json"), `${JSON.stringify(data, null, 2)}\n`);
console.log(
  `data.json: ${featured.title} (spread ${(spread(featured) * 100).toFixed(1)} pts), replay ${hunch.replay.fires} fires / ${hunch.replay.right} right, ${data.memoryLines.length} memory lines, ${data.status.memoriesWritten} written, ${data.tests} tests`,
);
export type FilmData = typeof data;
