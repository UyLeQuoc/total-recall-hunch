import { Ascii, fbm, textMask } from "./ascii.ts";
import { clamp, h } from "./lib.ts";

const dark = new URLSearchParams(location.search).get("theme") !== "light";
const BG = dark ? "#141416" : "#f7f7f7";
const FG = dark ? "#ececef" : "#141416";
const MUTED = dark ? "#7d8088" : "#8e9097";
const W = 1600;
const H = 560;

async function draw(): Promise<void> {
  await Promise.all(
    ["400 40px Inter", "600 40px Inter", "500 40px 'Geist Mono'", "400 40px 'Geist Mono'"].map(
      (f) => document.fonts.load(f),
    ),
  );
  await document.fonts.ready;
  const root = document.getElementById("b") as HTMLElement;
  root.style.background = BG;
  root.style.color = FG;
  const field = new Ascii(root, 8, 14, W, H);
  const mask = textMask(field, "hunch", { size: 330, x: W / 2, y: 228, weight: 500 });
  field.paint((x, y, i, j) => {
    const inside = mask[j * field.cols + i] ?? 0;
    const n = fbm(x * 0.007, y * 0.013, 3.4);
    const band = Math.exp(-(((x / W - 0.62) * 5) ** 2)) * 0.35;
    if (inside > 0.15) return 0.42 + 0.5 * n + band;
    return clamp((n - 0.62) * 2.4) * 0.32 * clamp((390 - y) / 50) * clamp((y - 64) / 30);
  }, FG);
  const tag = h("div", "tag", root);
  tag.textContent = "Test your hunch before you bet.";
  const sub = h("div", "sub", root);
  sub.textContent = "say it · hunch tests it · sui proves it · walrus memory learns who to trust";
  const tl = h("div", "corner tl", root);
  tl.textContent = "hunch";
  const tr = h("div", "corner tr", root);
  tr.textContent = "walrus × tatum · total recall · track 1";
  for (const k of ["k1", "k2", "k3", "k4"]) h("i", k, root);
  root.style.setProperty("--muted", MUTED);
  window.BANNER_READY = true;
}

declare global {
  interface Window {
    BANNER_READY: boolean;
  }
}
window.BANNER_READY = false;
void draw();
