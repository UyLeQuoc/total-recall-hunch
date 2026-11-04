/**
 * Renders the README banner with the film's ASCII engine, in both themes, into docs/media.
 *   bun banner.ts
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import http from "node:http";
import { basename, join } from "node:path";
import { chromium } from "playwright";

const HERE = new URL(".", import.meta.url).pathname;
const OUT = join(HERE, "..", "..", "docs", "media");
const FONT_DIRS = ["inter", "geist-mono"].map((f) =>
  join(HERE, "node_modules", "@fontsource", f, "files"),
);

const built = await Bun.build({
  entrypoints: [join(HERE, "film", "banner.ts")],
  target: "browser",
  format: "iife",
});
if (!built.success) throw new Error(built.logs.map(String).join("\n"));
const js = (await built.outputs[0]?.text()) ?? "";
const faces = [
  ["Inter", 400, "inter-latin-400-normal"],
  ["Inter", 600, "inter-latin-600-normal"],
  ["Geist Mono", 400, "geist-mono-latin-400-normal"],
  ["Geist Mono", 500, "geist-mono-latin-500-normal"],
]
  .map(
    ([f, w, file]) =>
      `@font-face{font-family:'${f}';font-weight:${w};src:url(/fonts/${file}.woff2) format('woff2')}`,
  )
  .join("");
const page = `<!doctype html><meta charset="utf-8"><style>${faces}
html,body{margin:0;background:transparent}
#b{position:relative;width:1600px;height:560px;overflow:hidden;font-family:Inter,sans-serif;-webkit-font-smoothing:antialiased}
canvas{position:absolute;left:0;top:0}
.tag{position:absolute;left:0;right:0;top:428px;text-align:center;font-size:40px;font-weight:600;letter-spacing:-0.025em}
.sub{position:absolute;left:0;right:0;top:488px;text-align:center;font:400 19px 'Geist Mono',monospace;color:var(--muted)}
.corner{position:absolute;top:26px;font:400 15px 'Geist Mono',monospace;letter-spacing:.08em;color:var(--muted)}
.tl{left:52px}.tr{right:52px}
i{position:absolute;width:16px;height:16px;border:0 solid var(--muted);opacity:.8}
.k1{left:24px;top:20px;border-width:1.5px 0 0 1.5px}.k2{right:24px;top:20px;border-width:1.5px 1.5px 0 0}
.k3{left:24px;bottom:20px;border-width:0 0 1.5px 1.5px}.k4{right:24px;bottom:20px;border-width:0 1.5px 1.5px 0}
</style><div id="b"></div><script src="/b.js"></script>`;

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://x");
  if (url.pathname === "/b.js")
    return void res.writeHead(200, { "Content-Type": "text/javascript" }).end(js);
  if (url.pathname.startsWith("/fonts/")) {
    const dir = FONT_DIRS.find((d) => existsSync(join(d, basename(url.pathname))));
    if (dir)
      return void res
        .writeHead(200, { "Content-Type": "font/woff2" })
        .end(readFileSync(join(dir, basename(url.pathname))));
  }
  if (url.pathname === "/")
    return void res.writeHead(200, { "Content-Type": "text/html" }).end(page);
  res.writeHead(404).end();
});
await new Promise<void>((r) => server.listen(0, r));
const address = server.address();
const base = `http://localhost:${typeof address === "object" && address ? address.port : 0}/`;
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ["--force-color-profile=srgb"] });
try {
  for (const theme of ["dark", "light"]) {
    const tab = await browser.newPage({
      viewport: { width: 1600, height: 560 },
      deviceScaleFactor: 2,
    });
    await tab.goto(`${base}?theme=${theme}`);
    await tab.waitForFunction(() => window.BANNER_READY);
    await tab.locator("#b").screenshot({ path: join(OUT, `banner-${theme}.png`) });
    console.log("banner", theme);
  }
} finally {
  await browser.close();
  server.close();
}
