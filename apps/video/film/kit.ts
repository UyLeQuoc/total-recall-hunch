import type { FilmData } from "../data.ts";
import { Ascii, GLYPHS } from "./ascii.ts";
import { clamp, ease, h, pose, prog, rng, type Scene } from "./lib.ts";

export type Bg = "ink" | "paper";
export const INK = "#141416";
export const PAPER = "#f7f7f7";
export const FG: Record<Bg, string> = { ink: "#ececef", paper: "#141416" };
export const DIM: Record<Bg, string> = { ink: "#3a3c43", paper: "#cfd1d5" };
export const MUTED: Record<Bg, string> = { ink: "#7d8088", paper: "#8e9097" };
export const HIT: Record<Bg, string> = { ink: "#5fd39a", paper: "#2f8a5b" };
export const MISS: Record<Bg, string> = { ink: "#ff7a6e", paper: "#c4483e" };
export const SUI = "#4da2ff";

export const data = (): FilmData => window.DATA;

export interface Stage {
  root: HTMLElement;
  cam: HTMLElement;
  bg: Bg;
  ascii(cw?: number, ch?: number): Ascii;
}

export interface Act extends Scene {
  bg: Bg;
  label: string;
}

export function act(
  label: string,
  parent: HTMLElement,
  start: number,
  end: number,
  bg: Bg,
  build: (st: Stage) => (t: number, u: number) => void,
): Act {
  const root = h("div", `scene ${bg}`, parent);
  const cam = h("div", "cam", root);
  const st: Stage = {
    root,
    cam,
    bg,
    ascii: (cw = 12, ch = 22) => new Ascii(cam, cw, ch),
  };
  const draw = build(st);
  return { name: label, label, bg, start, end, root, render: (t) => draw(t, t - start) };
}

export function camera(
  st: Stage,
  o: { s?: number; x?: number; y?: number; r?: number; rx?: number; ry?: number },
): void {
  const parts = [
    `translate3d(${(o.x ?? 0).toFixed(1)}px, ${(o.y ?? 0).toFixed(1)}px, 0)`,
    `rotateX(${(o.rx ?? 0).toFixed(2)}deg)`,
    `rotateY(${(o.ry ?? 0).toFixed(2)}deg)`,
    `rotate(${(o.r ?? 0).toFixed(2)}deg)`,
    `scale(${(o.s ?? 1).toFixed(4)})`,
  ];
  st.cam.style.transform = parts.join(" ");
}

export function el(parent: HTMLElement, cls: string, text = "", css = ""): HTMLElement {
  const e = h("div", `c ${cls}`, parent);
  e.textContent = text;
  if (css) e.style.cssText += css;
  return e;
}

/** `text` resolving out of glyph noise from left to right as p goes 0 → 1. */
export function decode(text: string, p: number, seed = 1, spread = 0.35): string {
  if (p <= 0) return "";
  const r = rng(seed * 977 + Math.floor(p * 30));
  const chars = Array.from(text);
  return chars
    .map((c, i) => {
      if (c === " ") return " ";
      const at = (i / Math.max(1, chars.length)) * (1 - spread);
      if (p >= at + spread) return c;
      if (p < at) return p > 0 ? " " : "";
      return GLYPHS[Math.floor(r() * GLYPHS.length)] ?? "#";
    })
    .join("");
}

export const visible = (t: number, a: number, b = Infinity) => t >= a && t < b;
export const fin = (t: number, a: number, d = 0.35) => ease.outExpo(prog(t, a, d));
export const fout = (t: number, a: number, d = 0.3) => 1 - ease.inCubic(prog(t, a, d));

export function place(
  e: HTMLElement,
  x: number,
  y: number,
  o = 1,
  extra: { s?: number; r?: number; center?: boolean } = {},
): void {
  pose(e, { x, y, o, s: extra.s ?? 1, r: extra.r ?? 0, center: extra.center ?? true });
}

export function bar(frac: number, width: number, full = "█", empty = "·"): string {
  const n = Math.round(clamp(frac) * width);
  return full.repeat(n) + empty.repeat(Math.max(0, width - n));
}

const SPARK = "▁▂▃▄▅▆▇█";
export function spark(series: number[], p = 1): string {
  const lo = Math.min(...series);
  const hi = Math.max(...series);
  const n = Math.round(series.length * clamp(p));
  return series
    .slice(0, n)
    .map((v) => SPARK[Math.round(((v - lo) / (hi - lo || 1)) * (SPARK.length - 1))] ?? "▁")
    .join("");
}

const SPIN = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";
export const spinner = (t: number) => SPIN[Math.floor(t * 12) % SPIN.length] ?? "·";

export function wrap(parts: string[], max: number): string[] {
  const out: string[] = [];
  for (const part of parts) {
    const last = out.at(-1);
    if (last !== undefined && last.length + part.length + 3 <= max)
      out[out.length - 1] = `${last} · ${part}`;
    else out.push(part);
  }
  return out;
}

export const pct = (p: number) => `${(p * 100).toFixed(1)}%`;
export const short = (s: string, n = 12) => (s.length > n + 1 ? `${s.slice(0, n)}…` : s);
