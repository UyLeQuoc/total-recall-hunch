import type { FilmData } from "../data.ts";
import { Ascii, cellNoise } from "./ascii.ts";
import { type Act, INK, PAPER } from "./kit.ts";
import { barAt, clamp, cues, ease, h, prog, sfx } from "./lib.ts";
import { aHunch, board, split, title, winsStick } from "./scenes-a.ts";
import { noHiding, record, replay, sayIt } from "./scenes-b.ts";
import { end, hood, learn, memory, proven } from "./scenes-c.ts";

type Cut = "dissolve" | "flash" | "none";
const stage = document.getElementById("stage") as HTMLElement;
const plan: Array<[(p: HTMLElement, a: number, b: number) => Act, number, Cut]> = [
  [aHunch, 4, "dissolve"],
  [winsStick, 4, "dissolve"],
  [title, 4, "flash"],
  [split, 4, "dissolve"],
  [board, 4, "dissolve"],
  [sayIt, 4, "dissolve"],
  [replay, 4, "dissolve"],
  [record, 4, "dissolve"],
  [noHiding, 4, "dissolve"],
  [memory, 6, "flash"],
  [learn, 6, "dissolve"],
  [proven, 2, "dissolve"],
  [hood, 5, "dissolve"],
  [end, 5, "none"],
];

const acts: Act[] = [];
const cuts: Array<{ at: number; kind: Cut; to: string; seed: number }> = [];
let bars = 0;
for (const [make, length, cut] of plan) {
  const start = barAt(bars);
  bars += length;
  const a = make(stage, start, barAt(bars));
  a.root.style.zIndex = String(acts.length + 1);
  acts.push(a);
  cuts.push({ at: barAt(bars), kind: cut, to: "", seed: acts.length });
}
cuts.forEach((c, i) => {
  const next = acts[i + 1];
  c.to = next ? (next.bg === "ink" ? INK : PAPER) : INK;
  if (c.kind === "dissolve") sfx(c.at - 0.25, "swish", 0.35);
});
const DURATION = barAt(bars);

const overlay = new Ascii(stage, 24, 40);
overlay.el.classList.add("overlay");
const flash = h("div", "flash", stage);
const hud = h("div", "hud", stage);
const hudTL = h("div", "tl", hud);
const hudTR = h("div", "tr", hud);
const hudBL = h("div", "bl", hud);
const hudBR = h("div", "br", hud);
for (const k of ["k1", "k2", "k3", "k4"]) h("i", k, hud);
hudTL.textContent = "hunch — showreel";
hudBR.textContent = "walrus × tatum · total recall";

const tc = (t: number) => {
  const f = Math.floor((t % 1) * 60);
  const sec = Math.floor(t);
  return `00:${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
};

const D = 0.3;
function render(t: number): void {
  let current = acts[0];
  for (const a of acts) {
    const on = t >= a.start && t < a.end;
    a.root.style.display = on ? "" : "none";
    if (on) {
      current = a;
      a.render(t);
    }
  }
  overlay.clear();
  let fo = 0;
  let fc = PAPER;
  for (const c of cuts) {
    if (c.kind === "dissolve" && t > c.at - D && t < c.at + D) {
      const p = (t - (c.at - D)) / (2 * D);
      const k = p < 0.5 ? p * 2 : (1 - p) * 2;
      const dir = c.seed % 3;
      overlay.blocks((i, j) => {
        const sweep =
          dir === 0
            ? i / overlay.cols
            : dir === 1
              ? j / overlay.rows
              : (i / overlay.cols + j / overlay.rows) / 2;
        const n = cellNoise(i, j, c.seed) * 0.55 + sweep * 0.45;
        return clamp((k * 1.7 - n) * 5);
      }, c.to);
    }
    if (c.kind === "flash" && t > c.at - 0.12 && t < c.at + 0.9) {
      fo = t < c.at ? prog(t, c.at - 0.12, 0.12) : 1 - ease.outCubic(prog(t, c.at, 0.9));
      fc = c.to === INK ? PAPER : "#ffffff";
    }
  }
  flash.style.background = fc;
  flash.style.opacity = fo.toFixed(3);
  const idx = current ? acts.indexOf(current) : 0;
  const dark = current?.bg === "ink";
  hud.classList.toggle("on-ink", dark);
  hud.style.opacity = String(clamp(prog(t, 0.8, 0.8)) * (1 - prog(t, DURATION - 3.6, 1.2)));
  hudTR.textContent = `${String(idx + 1).padStart(2, "0")} / ${String(acts.length).padStart(2, "0")}  ${current?.label ?? ""}`;
  hudBL.textContent = `${tc(t)}  ·  ${String(Math.floor(t / 2) + 1).padStart(2, "0")}/60`;
}

async function ready(): Promise<void> {
  const loads = ["400", "500", "600", "700"].map((w) => document.fonts.load(`${w} 40px "Inter"`));
  const mono = ["400", "500", "700"].map((w) => document.fonts.load(`${w} 40px "Geist Mono"`));
  await Promise.all([...loads, ...mono]);
  await document.fonts.ready;
  await Promise.all(
    Array.from(document.images).map((img) =>
      img.complete
        ? img.decode().catch(() => undefined)
        : new Promise((r) => img.addEventListener("load", r, { once: true })),
    ),
  );
  render(0);
}

declare global {
  interface Window {
    DATA: FilmData;
    FILM: {
      duration: number;
      cues: typeof cues;
      ready: Promise<void>;
      render: (t: number) => void;
    };
  }
}
window.FILM = { duration: DURATION, cues, ready: Promise.resolve(), render };
window.FILM.ready = ready();

const q = new URLSearchParams(location.search).get("t");
if (q) void window.FILM.ready.then(() => render(Number(q)));
