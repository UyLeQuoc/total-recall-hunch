import type { FilmData } from "../data.ts";
import { clamp, ease, h, lerp, pose, prog, pulse, type Scene, sfx, split, spring } from "./lib.ts";

export type Bg = "dark" | "light";
const BG: Record<Bg, string> = { dark: "#141416", light: "#f7f7f7" };
const GLOWS: Record<Bg, Array<[string, number, number, number]>> = {
  dark: [
    ["#22252e", 1500, 260, 760],
    ["#1d2a26", 320, 920, 640],
  ],
  light: [
    ["#ffffff", 300, 200, 760],
    ["#e9ebee", 1650, 900, 820],
  ],
};

export const data = (): FilmData => window.DATA;

export interface Stage {
  root: HTMLElement;
  cam: HTMLElement;
}

export function scene(
  name: string,
  parent: HTMLElement,
  start: number,
  end: number,
  bg: Bg,
  build: (st: Stage) => (t: number) => void,
): Scene {
  const root = h("div", "scene", parent);
  root.style.background = BG[bg];
  root.style.color = bg === "light" ? "#141416" : "#ececef";
  if (bg === "dark") root.classList.add("dark");
  const cam = h("div", "cam", root);
  const glows = GLOWS[bg].map(([color, x, y, size], i) => {
    const g = h("div", "glow c", cam);
    g.style.background = color;
    g.style.width = `${size}px`;
    g.style.height = `${size}px`;
    return { g, x, y, i };
  });
  h("div", "dots-bg", cam);
  const draw = build({ root, cam });
  return {
    name,
    start,
    end,
    root,
    render(t) {
      for (const { g, x, y, i } of glows)
        pose(g, {
          x: x + Math.sin(t * 0.4 + i) * 50,
          y: y + Math.cos(t * 0.3 + i * 2) * 40,
          o: bg === "light" ? 0.7 : 0.6,
        });
      draw(t);
    },
  };
}

export function camera(
  st: Stage,
  t: number,
  from: number,
  o: {
    push?: number;
    diveAt?: number;
    diveEnd?: number;
    diveTo?: [number, number];
    diveScale?: number;
  } = {},
): void {
  const push = 1 + (t - from) * (o.push ?? 0.012);
  let z = 0;
  if (o.diveAt !== undefined && o.diveEnd !== undefined)
    z = ease.inExpo(prog(t, o.diveAt, o.diveEnd - o.diveAt));
  const [x, y] = o.diveTo ?? [960, 540];
  st.cam.style.transformOrigin = `${x}px ${y}px`;
  st.cam.style.transform = `scale(${(push * (1 + z * (o.diveScale ?? 14))).toFixed(4)})`;
  st.cam.style.filter = z > 0.02 ? `blur(${(z * 6).toFixed(2)}px)` : "";
}

export function bigType(
  parent: HTMLElement,
  text: string,
  o: { size: number; color?: string; weight?: number; by?: "chars" | "words"; mono?: boolean },
) {
  const el = h("div", "c", parent);
  el.style.cssText += `font-size:${o.size}px;font-weight:${o.weight ?? 800};letter-spacing:${o.mono ? "-0.02em" : "-0.055em"};line-height:.95;white-space:nowrap;${o.color ? `color:${o.color};` : ""}`;
  if (o.mono) el.style.fontFamily = "var(--mono)";
  const pieces = split(el, text, o.by ?? "chars").filter((p) => p.classList.contains("piece"));
  return {
    el,
    pieces,
    render(t: number, at: number, stagger = 0.04, drop = 0.55) {
      pieces.forEach((p, i) => {
        const k = prog(t, at + i * stagger, 0.5);
        p.style.transform = `translateY(${((1 - ease.outBack(k, 2)) * o.size * drop).toFixed(1)}px) rotate(${((1 - ease.outCubic(k)) * (i % 2 ? 6 : -6)).toFixed(1)}deg)`;
        p.style.opacity = String(clamp(k * 3));
        p.style.filter = k < 1 ? `blur(${((1 - k) * 10).toFixed(1)}px)` : "";
      });
    },
  };
}

export function typeSounds(
  at: number,
  count: number,
  stagger: number,
  every = 3,
  gain = 0.32,
): void {
  for (let i = 0; i < count; i += every) sfx(at + i * stagger, "pop", gain);
}

export function keySounds(at: number, chars: number, seconds: number, gain = 0.5): void {
  const n = Math.max(1, Math.floor(chars / 3));
  for (let i = 0; i < n; i++) sfx(at + (i * seconds) / n, "type", gain);
}

export function slam(t: number, at: number, from = 2.6): number {
  if (t < at) return 0;
  const sp = spring(t, at, 2.6, 9);
  return lerp(from, 1, Math.min(1, sp)) + (sp > 1 ? (sp - 1) * 0.5 : 0);
}

export function shake(t: number, at: number, amount = 16): [number, number] {
  const p = pulse(t, at, 9) * amount;
  return [Math.sin(t * 53) * p, Math.cos(t * 41) * p];
}

export const popIn = (t: number, at: number) => (t < at ? 0 : spring(t, at, 2.3, 8));
export const fadeIn = (t: number, at: number, dur = 0.4) => ease.outExpo(prog(t, at, dur));
export const fadeOut = (t: number, at: number, dur = 0.4) => 1 - ease.inCubic(prog(t, at, dur));

export function kicker(parent: HTMLElement, text: string): HTMLElement {
  return h("div", "kicker c", parent, text);
}

export function text(parent: HTMLElement, cls: string, value: string, css = ""): HTMLElement {
  const el = h("div", `c ${cls}`, parent);
  el.textContent = value;
  if (css) el.style.cssText += css;
  return el;
}

export function bar(frac: number, width: number): string {
  const n = Math.round(clamp(frac) * width);
  return "█".repeat(n) + "░".repeat(Math.max(0, width - n));
}

export const short = (s: string, head = 10) => (s.length > head + 2 ? `${s.slice(0, head)}…` : s);
export const pct = (p: number) => `${(p * 100).toFixed(1)}%`;
