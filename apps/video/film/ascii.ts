import { clamp } from "./lib.ts";

export const RAMP = " .·:-=+*#%@";
export const SHADE = " ·░▒▓█";
export const GLYPHS = "abcdef0123456789#%*+=-:.·/\\|<>";

function hash(x: number, y: number, z: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1440662683);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const fade = (t: number) => t * t * (3 - 2 * t);

export function noise(x: number, y: number, z: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const u = fade(x - xi);
  const v = fade(y - yi);
  const w = fade(z - zi);
  const l = (a: number, b: number, p: number) => a + (b - a) * p;
  const c = (dx: number, dy: number, dz: number) => hash(xi + dx, yi + dy, zi + dz);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v),
    l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  );
}

export function fbm(x: number, y: number, z: number, octaves = 3): number {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += noise(x * f, y * f, z * f + o * 7.1) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
}

export const cellNoise = (i: number, j: number, seed = 0) => hash(i, j, seed);

export class Ascii {
  readonly el: HTMLCanvasElement;
  readonly cols: number;
  readonly rows: number;
  readonly cw: number;
  readonly ch: number;
  private readonly ctx: CanvasRenderingContext2D;

  constructor(parent: HTMLElement, cw = 12, ch = 22, w = 1920, h = 1080) {
    this.cw = cw;
    this.ch = ch;
    this.el = document.createElement("canvas");
    this.el.width = w;
    this.el.height = h;
    this.el.className = "ascii";
    parent.appendChild(this.el);
    const ctx = this.el.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    this.ctx = ctx;
    this.cols = Math.ceil(w / cw);
    this.rows = Math.ceil(h / ch);
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.el.width, this.el.height);
  }

  paint(
    fn: (x: number, y: number, i: number, j: number) => number,
    color: string,
    ramp = RAMP,
    alpha = 1,
  ): void {
    const ctx = this.ctx;
    ctx.font = `${Math.round(this.cw / 0.6)}px "Geist Mono"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    const top = ramp.length - 1;
    for (let j = 0; j < this.rows; j++) {
      const y = j * this.ch + this.ch / 2;
      for (let i = 0; i < this.cols; i++) {
        const x = i * this.cw + this.cw / 2;
        const v = fn(x, y, i, j);
        if (v <= 0.02) continue;
        const ch = ramp[Math.min(top, Math.round(clamp(v) * top))];
        if (ch && ch !== " ") ctx.fillText(ch, x, y);
      }
    }
    ctx.globalAlpha = 1;
  }

  glyphs(
    fn: (x: number, y: number, i: number, j: number) => string,
    color: string,
    alpha = 1,
  ): void {
    const ctx = this.ctx;
    ctx.font = `${Math.round(this.cw / 0.6)}px "Geist Mono"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    for (let j = 0; j < this.rows; j++) {
      const y = j * this.ch + this.ch / 2;
      for (let i = 0; i < this.cols; i++) {
        const x = i * this.cw + this.cw / 2;
        const c = fn(x, y, i, j);
        if (c && c !== " ") ctx.fillText(c, x, y);
      }
    }
    ctx.globalAlpha = 1;
  }

  blocks(fn: (i: number, j: number) => number, color: string): void {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.font = `${Math.round(this.cw / 0.6)}px "Geist Mono"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let j = 0; j < this.rows; j++) {
      for (let i = 0; i < this.cols; i++) {
        const v = fn(i, j);
        if (v <= 0) continue;
        if (v >= 1) ctx.fillRect(i * this.cw, j * this.ch, this.cw + 0.5, this.ch + 0.5);
        else {
          const c = SHADE[Math.max(1, Math.min(4, Math.round(v * 4)))];
          if (c) ctx.fillText(c, i * this.cw + this.cw / 2, j * this.ch + this.ch / 2);
        }
      }
    }
  }
}

const masks = new Map<string, Float32Array>();

/** Coverage (0..1) of `text` per cell of `a`, drawn at `size` px centred on (x, y). Cached. */
export function textMask(
  a: Ascii,
  text: string,
  o: { size: number; x?: number; y?: number; weight?: number; family?: string },
): Float32Array {
  const key = `${text}|${o.size}|${o.x}|${o.y}|${o.weight}|${o.family}|${a.cw}x${a.ch}`;
  const hit = masks.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = a.el.width;
  c.height = a.el.height;
  const ctx = c.getContext("2d");
  const out = new Float32Array(a.cols * a.rows);
  if (!ctx) return out;
  ctx.font = `${o.weight ?? 600} ${o.size}px ${o.family ?? '"Geist Mono"'}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.fillText(text, o.x ?? c.width / 2, o.y ?? c.height / 2);
  const img = ctx.getImageData(0, 0, c.width, c.height).data;
  for (let j = 0; j < a.rows; j++)
    for (let i = 0; i < a.cols; i++) {
      let sum = 0;
      for (const [fx, fy] of [
        [0.25, 0.25],
        [0.75, 0.25],
        [0.25, 0.75],
        [0.75, 0.75],
        [0.5, 0.5],
      ] as const) {
        const px = Math.min(c.width - 1, Math.floor((i + fx) * a.cw));
        const py = Math.min(c.height - 1, Math.floor((j + fy) * a.ch));
        sum += (img[(py * c.width + px) * 4 + 3] ?? 0) / 255;
      }
      out[j * a.cols + i] = sum / 5;
    }
  masks.set(key, out);
  return out;
}

/** A lit sphere with a lat/long grid, rotating; returns density, or -1 outside. */
export function sphere(
  x: number,
  y: number,
  cx: number,
  cy: number,
  r: number,
  spin: number,
  tilt = 0.35,
): { d: number; lat: number; lon: number } | null {
  const dx = (x - cx) / r;
  const dy = (y - cy) / r;
  const r2 = dx * dx + dy * dy;
  if (r2 > 1) return null;
  const z = Math.sqrt(1 - r2);
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  const y1 = dy * ct - z * st;
  const z1 = dy * st + z * ct;
  const cs = Math.cos(spin);
  const ss = Math.sin(spin);
  const x2 = dx * cs + z1 * ss;
  const z2 = -dx * ss + z1 * cs;
  const lat = Math.asin(clamp(-y1, -1, 1));
  const lon = Math.atan2(x2, z2);
  const light = Math.max(0, -0.45 * dx - 0.55 * dy + 0.7 * z);
  return { d: 0.12 + 0.62 * light, lat, lon };
}

/** An orthographic rotating cube by slab intersection: density from the lit face, 1 on edges, -1 off it. */
export function cube(
  x: number,
  y: number,
  cx: number,
  cy: number,
  size: number,
  ax: number,
  ay: number,
): number {
  const px = (x - cx) / size;
  const py = (y - cy) / size;
  const ca = Math.cos(ax);
  const sa = Math.sin(ax);
  const cb = Math.cos(ay);
  const sb = Math.sin(ay);
  const rot = (vx: number, vy: number, vz: number): [number, number, number] => {
    const x1 = vx * cb + vz * sb;
    const z1 = -vx * sb + vz * cb;
    return [x1, vy * ca - z1 * sa, vy * sa + z1 * ca];
  };
  const inv = (vx: number, vy: number, vz: number): [number, number, number] => {
    const y1 = vy * ca + vz * sa;
    const z1 = -vy * sa + vz * ca;
    return [vx * cb - z1 * sb, y1, vx * sb + z1 * cb];
  };
  const o = inv(px, py, -3);
  const d = inv(0, 0, 1);
  let tmin = -Infinity;
  let tmax = Infinity;
  let axis = 0;
  let sign = 1;
  for (let k = 0; k < 3; k++) {
    const ok = o[k] ?? 0;
    const dk = d[k] ?? 0;
    if (Math.abs(dk) < 1e-9) {
      if (ok < -0.5 || ok > 0.5) return -1;
      continue;
    }
    let t1 = (-0.5 - ok) / dk;
    let t2 = (0.5 - ok) / dk;
    let s = -1;
    if (t1 > t2) {
      [t1, t2] = [t2, t1];
      s = 1;
    }
    if (t1 > tmin) {
      tmin = t1;
      axis = k;
      sign = s;
    }
    tmax = Math.min(tmax, t2);
  }
  if (tmin > tmax || tmax < 0) return -1;
  const hit = [0, 1, 2].map((k) => (o[k] ?? 0) + (d[k] ?? 0) * tmin);
  const edge = hit.filter((v) => Math.abs(v) > 0.46).length >= 2;
  if (edge) return 1;
  const n: [number, number, number] = [0, 0, 0];
  n[axis] = sign;
  const [nx, ny, nz] = rot(n[0], n[1], n[2]);
  const light = Math.max(0, -0.4 * nx - 0.5 * ny - 0.75 * nz);
  return 0.18 + 0.6 * light;
}
