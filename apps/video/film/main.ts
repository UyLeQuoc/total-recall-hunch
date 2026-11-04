import type { FilmData } from "../data.ts";
import { barAt, cues, ease, h, prog, rng, type Scene, sfx } from "./lib.ts";
import {
  noHiding,
  open,
  problem,
  record,
  replay,
  rule,
  sayIt,
  sources,
  title,
} from "./scenes-1.ts";
import { call, end, hood, learning, memory, montage, proven, scored } from "./scenes-2.ts";

type Kind = "flash" | "wipe" | "iris" | "cut";
interface Cut {
  kind: Kind;
  color: string;
}

const stage = document.getElementById("stage") as HTMLElement;
const plan: Array<[(s: HTMLElement, a: number, b: number) => Scene, number, Cut]> = [
  [open, 3, { kind: "flash", color: "#ffffff" }],
  [problem, 3, { kind: "wipe", color: "#141416" }],
  [title, 3, { kind: "flash", color: "#ffffff" }],
  [sources, 3, { kind: "wipe", color: "#141416" }],
  [sayIt, 4, { kind: "flash", color: "#ffffff" }],
  [rule, 3, { kind: "iris", color: "" }],
  [replay, 4, { kind: "flash", color: "#ffffff" }],
  [record, 4, { kind: "wipe", color: "#141416" }],
  [noHiding, 3, { kind: "flash", color: "#ffffff" }],
  [scored, 3, { kind: "wipe", color: "#141416" }],
  [memory, 4, { kind: "flash", color: "#7ce8d6" }],
  [call, 3, { kind: "iris", color: "" }],
  [learning, 4, { kind: "flash", color: "#ffffff" }],
  [proven, 2, { kind: "wipe", color: "#141416" }],
  [montage, 3, { kind: "flash", color: "#ffffff" }],
  [hood, 3, { kind: "flash", color: "#ffffff" }],
  [end, 3, { kind: "cut", color: "" }],
];

const scenes: Scene[] = [];
const cuts: Array<Cut & { at: number }> = [];
let bars = 0;
for (const [make, length, cut] of plan) {
  const start = barAt(bars);
  bars += length;
  const stop = barAt(bars);
  const sc = make(stage, start, stop);
  sc.root.style.zIndex = String(scenes.length + 1);
  scenes.push(sc);
  cuts.push({ ...cut, at: stop });
  if (cut.kind === "flash") sfx(stop - 0.08, "whoosh", 0.45);
  if (cut.kind === "wipe") sfx(stop - 0.2, "swish", 0.7);
  if (cut.kind === "iris") sfx(stop, "swish", 0.5);
}
const DURATION = barAt(bars);
sfx(barAt(6) - 2.2, "riser", 0.35);
sfx(barAt(37) - 2.2, "riser", 0.35);

const wipe = h("div", "wipe", stage);
const flash = h("div", "flash", stage);
const grain = h("div", "grain", stage);
h("div", "vignette", stage);

function noise(): string {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(256, 256);
  const r = rng(99);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(r() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}
grain.style.backgroundImage = `url(${noise()})`;

const IRIS = 0.65;

function render(t: number): void {
  scenes.forEach((sc, i) => {
    const before = i > 0 ? cuts[i - 1] : undefined;
    const after = cuts[i];
    const lingers = after?.kind === "iris" ? IRIS : 0;
    const visible = t >= sc.start && t < sc.end + lingers;
    sc.root.style.display = visible ? "" : "none";
    sc.root.style.clipPath = "";
    if (!visible) return;
    if (before?.kind === "iris" && t < sc.start + IRIS) {
      const r = ease.inOutCubic(prog(t, sc.start, IRIS)) * 2300;
      sc.root.style.clipPath = `circle(${r.toFixed(1)}px at 960px 540px)`;
    }
    sc.render(t);
  });

  let fo = 0;
  let fc = "#fff";
  let wx = 2400;
  let wc = "#000";
  for (const c of cuts) {
    if (c.kind === "flash" && t > c.at - 0.25 && t < c.at + 0.6) {
      fo =
        t < c.at ? ease.inCubic(prog(t, c.at - 0.25, 0.25)) : 1 - ease.outCubic(prog(t, c.at, 0.6));
      fc = c.color;
    }
    if (c.kind === "wipe" && t > c.at - 0.35 && t < c.at + 0.4) {
      wx =
        t < c.at
          ? (1 - ease.inCubic(prog(t, c.at - 0.35, 0.35))) * 2400
          : -ease.outCubic(prog(t, c.at, 0.4)) * 2600;
      wc = c.color;
    }
  }
  flash.style.background = fc;
  flash.style.opacity = fo.toFixed(3);
  wipe.style.background = wc;
  wipe.style.display = wx > 2300 || wx < -2500 ? "none" : "";
  wipe.style.transform = `translateX(${wx.toFixed(1)}px) skewX(-14deg) scaleX(1.4)`;
  const dark =
    scenes.find((sc) => t >= sc.start && t < sc.end)?.root.classList.contains("dark") ?? false;
  grain.classList.toggle("on-dark", dark);
  const f = Math.floor(t * 24);
  grain.style.backgroundPosition = `${(f * 73) % 256}px ${(f * 151) % 256}px`;
}

async function ready(): Promise<void> {
  const loads = ["400", "500", "600", "700", "800", "900"].map((w) =>
    document.fonts.load(`${w} 40px "Inter"`),
  );
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
