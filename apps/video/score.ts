/**
 * The film's score, synthesised: 60 bars at 120 BPM in A minor (Am F C G), stereo, 48 kHz.
 * Sections follow the picture: intro 0–7, build 8–11, groove 12–35, break 36–41, drop 42–55, outro 56–59.
 */
export const SR = 48_000;
export const BPM = 120;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
export const BARS = 60;
const SECONDS = BARS * BAR + 2;
const N = Math.ceil(SECONDS * SR);

type Section = "intro" | "build" | "groove" | "break" | "drop" | "outro";
export function sectionAt(bar: number): Section {
  if (bar < 8) return "intro";
  if (bar < 12) return "build";
  if (bar < 36) return "groove";
  if (bar < 42) return "break";
  if (bar < 56) return "drop";
  return "outro";
}

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const CHORDS = [
  [57, 60, 64],
  [53, 57, 60],
  [48, 52, 55],
  [55, 59, 62],
];
const ROOTS = [45, 41, 48, 43];

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let r = Math.imul(a ^ (a >>> 15), 1 | a);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

class Bus {
  readonly l = new Float32Array(N);
  readonly r = new Float32Array(N);
  add(i: number, v: number, pan = 0): void {
    if (i < 0 || i >= N) return;
    const gl = Math.cos(((pan + 1) * Math.PI) / 4);
    const gr = Math.sin(((pan + 1) * Math.PI) / 4);
    this.l[i] = (this.l[i] ?? 0) + v * gl * Math.SQRT2;
    this.r[i] = (this.r[i] ?? 0) + v * gr * Math.SQRT2;
  }
}

class Svf {
  private ic1 = 0;
  private ic2 = 0;
  low = 0;
  band = 0;
  high = 0;
  run(x: number, fc: number, q: number): number {
    const g = Math.tan((Math.PI * Math.min(fc, SR * 0.45)) / SR);
    const k = 1 / q;
    const a1 = 1 / (1 + g * (g + k));
    const a2 = g * a1;
    const a3 = g * a2;
    const v3 = x - this.ic2;
    const v1 = a1 * this.ic1 + a2 * v3;
    const v2 = this.ic2 + a2 * this.ic1 + a3 * v3;
    this.ic1 = 2 * v1 - this.ic1;
    this.ic2 = 2 * v2 - this.ic2;
    this.low = v2;
    this.band = v1;
    this.high = x - k * v1 - v2;
    return v2;
  }
}

function blep(t: number, dt: number): number {
  if (t < dt) {
    const x = t / dt;
    return x + x - x * x - 1;
  }
  if (t > 1 - dt) {
    const x = (t - 1) / dt;
    return x * x + x + x + 1;
  }
  return 0;
}

class Saw {
  private p: number;
  constructor(phase = 0) {
    this.p = phase;
  }
  next(f: number): number {
    const dt = f / SR;
    this.p += dt;
    if (this.p >= 1) this.p -= 1;
    return 2 * this.p - 1 - blep(this.p, dt);
  }
}

class Pulse {
  private p = 0;
  next(f: number, width = 0.5): number {
    const dt = f / SR;
    this.p += dt;
    if (this.p >= 1) this.p -= 1;
    let v = this.p < width ? 1 : -1;
    v += blep(this.p, dt);
    let q = this.p - width;
    if (q < 0) q += 1;
    v -= blep(q, dt);
    return v;
  }
}

const drums = new Bus();
const bass = new Bus();
const pads = new Bus();
const arps = new Bus();
const leads = new Bus();
const bells = new Bus();
const fx = new Bus();
const kicks: number[] = [];

function kick(t0: number, gain = 1): void {
  kicks.push(t0);
  const start = Math.round(t0 * SR);
  const len = Math.round(0.5 * SR);
  const r = rng(start);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = 44 + 120 * Math.exp(-t / 0.028) + 40 * Math.exp(-t / 0.004);
    ph += (2 * Math.PI * f) / SR;
    const body = Math.sin(ph) * Math.exp(-t / 0.32) * Math.min(1, t / 0.0015);
    const click = (r() * 2 - 1) * Math.exp(-t / 0.0025) * 0.35;
    drums.add(start + i, Math.tanh((body * 1.3 + click) * 1.4) * 0.95 * gain);
  }
}

function clap(t0: number, gain = 1): void {
  const start = Math.round(t0 * SR);
  const len = Math.round(0.35 * SR);
  const r = rng(start + 7);
  const f = new Svf();
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const bursts = [0, 0.011, 0.022].reduce(
      (a, o) => a + (t >= o ? Math.exp(-(t - o) / (o === 0.022 ? 0.12 : 0.008)) : 0),
      0,
    );
    const n = f.run(r() * 2 - 1, 1500, 1.4);
    const tone = Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t / 0.05) * 0.4;
    drums.add(start + i, (n * 1.8 * Math.min(1, bursts) + tone) * 0.55 * gain, 0.05);
  }
}

function hat(t0: number, open: boolean, gain = 1, pan = 0.25): void {
  const start = Math.round(t0 * SR);
  const len = Math.round((open ? 0.28 : 0.06) * SR);
  const r = rng(start + 3);
  const f = new Svf();
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    f.run(r() * 2 - 1, 8500, 0.9);
    drums.add(start + i, f.high * Math.exp(-t / (open ? 0.09 : 0.016)) * 0.28 * gain, pan);
  }
}

function bassNote(t0: number, midi: number, dur: number, cutoff: number, gain = 1): void {
  const start = Math.round(t0 * SR);
  const len = Math.round((dur + 0.05) * SR);
  const saw = new Saw();
  const f = new Svf();
  let sub = 0;
  const fr = hz(midi);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.004) * (t < dur ? 1 : Math.exp(-(t - dur) / 0.015));
    const fc = 90 + cutoff * Math.exp(-t / 0.09);
    const s = f.run(saw.next(fr), fc, 1.6);
    sub += (2 * Math.PI * fr) / SR;
    bass.add(start + i, (s * 0.7 + Math.sin(sub) * 0.6) * env * 0.55 * gain);
  }
}

function pluck(
  bus: Bus,
  t0: number,
  midi: number,
  cutoff: number,
  gain: number,
  pan: number,
  decay = 0.14,
): void {
  const start = Math.round(t0 * SR);
  const len = Math.round((decay * 6 + 0.02) * SR);
  const osc = new Pulse();
  const osc2 = new Saw(0.3);
  const f = new Svf();
  const fr = hz(midi);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.002) * Math.exp(-t / decay);
    const fc = 200 + cutoff * Math.exp(-t / (decay * 0.8));
    const v = f.run(osc.next(fr, 0.3) * 0.6 + osc2.next(fr * 1.004) * 0.4, fc, 2.2);
    bus.add(start + i, v * env * gain, pan);
  }
}

function padChord(t0: number, notes: number[], dur: number, cutoff: number, gain = 1): void {
  const start = Math.round(t0 * SR);
  const len = Math.round((dur + 1.2) * SR);
  const voices = notes.flatMap((m, k) =>
    [-1, 1].map((side) => ({
      f: hz(m) * 2 ** ((side * (6 + k * 2)) / 1200),
      osc: new Saw((k * 0.37 + side * 0.11 + 1) % 1),
      side,
    })),
  );
  const fl = new Svf();
  const fr = new Svf();
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.45) * (t < dur ? 1 : Math.exp(-(t - dur) / 0.45));
    let l = 0;
    let r = 0;
    for (const v of voices) {
      const s = v.osc.next(v.f);
      if (v.side < 0) l += s;
      else r += s;
    }
    const wob = cutoff * (1 + 0.15 * Math.sin(2 * Math.PI * 0.25 * (t0 + t)));
    const lo = fl.run(l, wob, 0.8) * env * 0.09 * gain;
    const ro = fr.run(r, wob, 0.8) * env * 0.09 * gain;
    pads.add(start + i, lo, -1);
    pads.add(start + i, ro, 1);
  }
}

function bell(t0: number, midi: number, gain: number, pan: number): void {
  const start = Math.round(t0 * SR);
  const len = Math.round(2.6 * SR);
  const fr = hz(midi);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const mod = Math.sin(2 * Math.PI * fr * 3.5 * t) * 2.2 * Math.exp(-t / 0.5);
    const v = Math.sin(2 * Math.PI * fr * t + mod) * Math.exp(-t / 0.9) * Math.min(1, t / 0.003);
    bells.add(start + i, v * gain, pan);
  }
}

function riser(t0: number, dur: number, gain = 1): void {
  const start = Math.round(t0 * SR);
  const len = Math.round(dur * SR);
  const r = rng(start + 11);
  const f = new Svf();
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const p = t / dur;
    f.run(r() * 2 - 1, 300 + 9000 * p * p, 1.2);
    ph += (2 * Math.PI * (120 + 900 * p * p)) / SR;
    const v = f.band * p ** 2.2 * 0.8 + Math.sin(ph) * p ** 3 * 0.12;
    fx.add(start + i, v * gain * (p > 0.985 ? (1 - p) / 0.015 : 1), Math.sin(t * 3) * 0.4);
  }
}

function impact(t0: number, gain = 1): void {
  const start = Math.round(t0 * SR);
  const len = Math.round(2.4 * SR);
  const r = rng(start + 5);
  const f = new Svf();
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * (32 + 60 * Math.exp(-t / 0.06))) / SR;
    const sub = Math.sin(ph) * Math.exp(-t / 0.9);
    const crack = f.run(r() * 2 - 1, 2500 * Math.exp(-t / 0.08) + 150, 0.7) * Math.exp(-t / 0.18);
    fx.add(start + i, Math.tanh((sub * 1.2 + crack * 1.4) * 1.2) * 0.8 * gain);
  }
}

function reverse(t0: number, dur: number, gain = 1): void {
  const start = Math.round(t0 * SR);
  const len = Math.round(dur * SR);
  const r = rng(start + 9);
  const f = new Svf();
  for (let i = 0; i < len; i++) {
    const p = i / len;
    f.run(r() * 2 - 1, 6000, 0.7);
    fx.add(start + i, f.high * p ** 3 * 0.35 * gain, 0.3);
  }
}

const ARP = [0, 1, 2, 3, 4, 3, 2, 1, 0, 2, 4, 2, 1, 3, 4, 3];
const ARP_B = [0, 2, 4, 2, 3, 1, 4, 1, 0, 2, 3, 4, 2, 4, 3, 1];
const LEAD = [
  [69, -1, 72, -1, 76, -1, 74, 72],
  [69, -1, -1, -1, 72, -1, 69, -1],
  [67, -1, 72, -1, 76, -1, 79, 76],
  [74, -1, -1, -1, 71, -1, 67, -1],
];

for (let bar = 0; bar < BARS; bar++) {
  const t0 = bar * BAR;
  const sec = sectionAt(bar);
  const c = bar % 4;
  const chord = CHORDS[c] ?? [57, 60, 64];
  const root = ROOTS[c] ?? 45;
  const tones = [
    chord[0] ?? 57,
    chord[1] ?? 60,
    chord[2] ?? 64,
    (chord[0] ?? 57) + 12,
    (chord[1] ?? 60) + 12,
  ];

  if (sec !== "outro" || bar === 56)
    padChord(
      t0,
      chord,
      BAR,
      sec === "intro" ? 500 + bar * 120 : sec === "break" ? 1400 : 2200,
      sec === "break" ? 1.3 : 1,
    );

  if (sec !== "outro") {
    const pat = sec === "drop" ? ARP_B : ARP;
    const cutoff =
      sec === "intro"
        ? 400 + bar * 260
        : sec === "build"
          ? 2000 + (bar - 8) * 600
          : sec === "break"
            ? 1600
            : 4200;
    const gain = sec === "intro" ? 0.13 : sec === "break" ? 0.1 : 0.16;
    for (let s = 0; s < 16; s++) {
      const m = tones[pat[s] ?? 0] ?? 57;
      pluck(arps, t0 + s * BEAT * 0.25, m + 12, cutoff, gain, s % 2 ? 0.35 : -0.35);
    }
  }

  const groove = sec === "groove" || sec === "drop";
  if (groove || (sec === "build" && bar >= 9)) {
    for (let b = 0; b < 4; b++) {
      if (sec === "build" && bar < 11 && b % 2 === 1) continue;
      kick(t0 + b * BEAT);
    }
  }
  if (groove) {
    clap(t0 + BEAT, 0.9);
    clap(t0 + BEAT * 3, 0.9);
    for (let e = 0; e < 8; e++) {
      if (e % 2 === 1) hat(t0 + e * BEAT * 0.5, e === 7 && bar % 2 === 1, 1);
      else hat(t0 + e * BEAT * 0.5, false, 0.35, -0.25);
    }
    if (sec === "drop" || bar >= 28)
      for (let s = 0; s < 16; s += 2) hat(t0 + s * BEAT * 0.25 + BEAT * 0.25, false, 0.25, 0.4);
    const pattern = sec === "drop" ? [0, 0, 12, 0, 0, 12, 0, 7] : [0, 0, 12, 0, 0, 0, 12, 0];
    for (let e = 0; e < 8; e++)
      bassNote(
        t0 + e * BEAT * 0.5,
        root + (pattern[e] ?? 0),
        BEAT * 0.42,
        sec === "drop" ? 1400 : 1000,
      );
    if (bar % 8 === 7)
      for (let s = 12; s < 16; s++) clap(t0 + s * BEAT * 0.25, 0.35 + (s - 12) * 0.12);
  }
  if (sec === "build") {
    if (bar >= 10)
      for (let e = 0; e < 8; e++)
        bassNote(t0 + e * BEAT * 0.5, root, BEAT * 0.4, 500 + (bar - 10) * 300, 0.8);
    if (bar === 11) for (let s = 0; s < 16; s++) clap(t0 + s * BEAT * 0.25, 0.25 + s * 0.04);
    for (let e = 1; e < 8; e += 2) hat(t0 + e * BEAT * 0.5, false, 0.6);
  }
  if (sec === "intro" && bar >= 4)
    for (let e = 1; e < 8; e += 2) hat(t0 + e * BEAT * 0.5, false, 0.35);
  if (sec === "break") {
    for (let q = 0; q < 4; q++)
      bell(t0 + q * BEAT, (tones[(q + bar) % 5] ?? 57) + 12, 0.16, q % 2 ? 0.4 : -0.4);
    bassNote(t0, root, BAR * 0.95, 200, 0.5);
  }
  if (sec === "drop") {
    const line = LEAD[c] ?? [];
    line.forEach((m, e) => {
      if (m > 0) pluck(leads, t0 + e * BEAT * 0.5, m, 3200, 0.22, 0, 0.22);
    });
  }
}

riser(20, 4, 1);
impact(24, 1);
reverse(54, 2, 0.8);
impact(56, 0.6);
riser(80, 4, 0.9);
impact(84, 1);
reverse(70, 2, 0.6);
impact(72, 0.7);
impact(112, 1.1);
for (const [k, m] of [57, 64, 69, 72].entries())
  bell(112 + k * 0.06, m + 12, 0.18, k % 2 ? 0.5 : -0.5);
padChord(112, [57, 60, 64, 69], 4, 1800, 1.2);
impact(116, 0.8);

function duckEnvelope(): Float32Array {
  const env = new Float32Array(N).fill(1);
  const span = Math.round(0.4 * SR);
  for (const kt of kicks) {
    const start = Math.round(kt * SR);
    for (let i = 0; i < span && start + i < N; i++) {
      const x = i / SR;
      const d = 1 - 0.65 * Math.exp(-x / 0.11) * Math.min(1, x / 0.004 + 0.3);
      if (d < (env[start + i] ?? 1)) env[start + i] = d;
    }
  }
  return env;
}

function delay(bus: Bus, seconds: number, feedback: number, mix: number): void {
  const d = Math.round(seconds * SR);
  for (let i = d; i < N; i++) {
    bus.l[i] = (bus.l[i] ?? 0) + (bus.r[i - d] ?? 0) * feedback * mix;
    bus.r[i] = (bus.r[i] ?? 0) + (bus.l[i - d] ?? 0) * feedback * mix;
  }
}

function reverb(input: Float32Array, seed: number): Float32Array {
  const scale = SR / 44_100;
  const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((d) => Math.round((d + seed) * scale));
  const out = new Float32Array(N);
  for (const d of combs) {
    const buf = new Float32Array(d);
    let idx = 0;
    let lp = 0;
    for (let i = 0; i < N; i++) {
      const y = buf[idx] ?? 0;
      lp = y * 0.6 + lp * 0.4;
      buf[idx] = (input[i] ?? 0) + lp * 0.84;
      out[i] = (out[i] ?? 0) + y;
      idx = (idx + 1) % d;
    }
  }
  for (const d of [556, 441, 341].map((x) => Math.round((x + seed) * scale))) {
    const buf = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < N; i++) {
      const b = buf[idx] ?? 0;
      const x = out[i] ?? 0;
      const y = -x + b;
      buf[idx] = x + b * 0.5;
      out[i] = y;
      idx = (idx + 1) % d;
    }
  }
  return out;
}

export function renderScore(): { l: Float32Array; r: Float32Array } {
  delay(arps, BEAT * 0.75, 0.38, 1);
  delay(leads, BEAT * 0.75, 0.42, 1);
  const sendL = new Float32Array(N);
  const sendR = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    sendL[i] =
      (pads.l[i] ?? 0) * 0.5 +
      (arps.l[i] ?? 0) * 0.5 +
      (bells.l[i] ?? 0) +
      (leads.l[i] ?? 0) * 0.4 +
      (drums.l[i] ?? 0) * 0.05;
    sendR[i] =
      (pads.r[i] ?? 0) * 0.5 +
      (arps.r[i] ?? 0) * 0.5 +
      (bells.r[i] ?? 0) +
      (leads.r[i] ?? 0) * 0.4 +
      (drums.r[i] ?? 0) * 0.05;
  }
  const wetL = reverb(sendL, 0);
  const wetR = reverb(sendR, 23);
  const l = new Float32Array(N);
  const r = new Float32Array(N);
  const end = BARS * BAR;
  const ducking = duckEnvelope();
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const dk = ducking[i] ?? 1;
    const fade = t > end - 1.5 ? Math.max(0, (end + 0.5 - t) / 2) : 1;
    const mixL =
      (drums.l[i] ?? 0) * 0.9 +
      (bass.l[i] ?? 0) * 0.75 * dk +
      (pads.l[i] ?? 0) * 0.55 * dk +
      (arps.l[i] ?? 0) * 0.5 * dk +
      (leads.l[i] ?? 0) * 0.45 * dk +
      (bells.l[i] ?? 0) * 0.5 +
      (fx.l[i] ?? 0) * 0.7 +
      (wetL[i] ?? 0) * 0.07;
    const mixR =
      (drums.r[i] ?? 0) * 0.9 +
      (bass.r[i] ?? 0) * 0.75 * dk +
      (pads.r[i] ?? 0) * 0.55 * dk +
      (arps.r[i] ?? 0) * 0.5 * dk +
      (leads.r[i] ?? 0) * 0.45 * dk +
      (bells.r[i] ?? 0) * 0.5 +
      (fx.r[i] ?? 0) * 0.7 +
      (wetR[i] ?? 0) * 0.07;
    l[i] = Math.tanh(mixL * 0.9) * fade;
    r[i] = Math.tanh(mixR * 0.9) * fade;
  }
  return { l, r };
}
