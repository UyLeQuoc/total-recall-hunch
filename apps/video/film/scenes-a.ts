import { cellNoise, fbm, textMask } from "./ascii.ts";
import {
  type Act,
  act,
  bar,
  camera,
  DIM,
  data,
  decode,
  el,
  FG,
  fin,
  fout,
  place,
  spark,
} from "./kit.ts";
import { BEAT, clamp, ease, h, lerp, prog, rng, sfx, typed } from "./lib.ts";

function keys(at: number, chars: number, seconds: number, gain = 0.4): void {
  const n = Math.max(1, Math.floor(chars / 2));
  for (let i = 0; i < n; i++) sfx(at + (i * seconds) / n, "type", gain);
}

export function aHunch(parent: HTMLElement, a: number, b: number): Act {
  const lineA = "everyone has a hunch.";
  const lineB = "almost nobody tests one.";
  const quotes: Array<[string, number, number]> = [
    ["“polymarket overprices nba favourites.”", 560, 250],
    ["“the books are sharper than kalshi.”", 1380, 350],
    ["“btc dumps after a 0.3% spike.”", 520, 820],
    ["“kalshi gets the senate right.”", 1400, 760],
  ];
  return act("a hunch", parent, a, b, "ink", (st) => {
    const field = st.ascii();
    const line = el(st.cam, "mono hero");
    const qs = quotes.map(([q, x, y], i) => {
      const at = 3 + i * BEAT;
      sfx(a + at, "blip", 0.35);
      return { q, x, y, at, e: el(st.cam, "mono quote") };
    });
    keys(a + 1.1, lineA.length, 1.5);
    sfx(a + 6, "glitch", 0.5);
    return (_t, u) => {
      field.clear();
      const dens = 0.12 + 0.55 * ease.inCubic(prog(u, 5.2, 2.6));
      const appear = fin(u, 0, 1.2);
      field.paint((x, y) => {
        const n = fbm(x * 0.0032, y * 0.0055, u * 0.22);
        return clamp((n - (0.66 - dens * 0.45)) * 3.2) * (0.3 + dens) * appear;
      }, DIM.ink);
      const text = u < 6 ? typed(lineA, prog(u, 1.1, 1.5)) : decode(lineB, prog(u, 6, 0.8), 3);
      line.innerHTML = "";
      h("span", "", line).textContent = text;
      h("span", Math.floor(u * 2.4) % 2 === 0 || (u > 1.1 && u < 2.7) ? "cur" : "cur off", line);
      place(line, 960, 540, fin(u, 0.4, 0.4));
      for (const { q, x, y, at, e } of qs) {
        e.textContent = decode(q, prog(u, at, 0.7), x);
        place(e, x, y, (u < 6 ? 1 : fout(u, 6, 0.5)) * 0.8);
      }
      camera(st, { s: 1 + u * 0.008 });
    };
  });
}

export function winsStick(parent: HTMLElement, a: number, b: number): Act {
  const COLS = 30;
  const ROWS = 6;
  const r = rng(42);
  const cells = Array.from({ length: COLS * ROWS }, () => (r() < 0.55 ? "w" : "l"));
  return act("wins stick", parent, a, b, "paper", (st) => {
    const grid = el(st.cam, "mono grid");
    const spans = cells.map((c, k) => {
      const s = h("span", c === "l" ? "loss" : "", grid);
      if (k % COLS === COLS - 1) h("br", "", grid);
      return s;
    });
    const wins = el(st.cam, "headline", "Wins stick.");
    const losses = el(st.cam, "headline", "Losses fade.");
    const nobody = el(st.cam, "headline xl", "");
    const sub = el(st.cam, "mono label", "");
    for (let k = 0; k < 24; k++) sfx(a + k * BEAT * 0.25, "tick", 0.18);
    sfx(a + 1, "thud", 0.5);
    sfx(a + 2, "thud", 0.5);
    sfx(a + 4.5, "swish", 0.5);
    return (_t, u) => {
      spans.forEach((s, k) => {
        const on = u >= (k / spans.length) * 1.5;
        const isLoss = cells[k] === "l";
        const f = isLoss ? prog(u, 2.2 + cellNoise(k, 1, 9) * 1.6, 0.6) : 0;
        const glyph =
          f <= 0 ? "█" : f < 0.25 ? "▓" : f < 0.5 ? "▒" : f < 0.75 ? "░" : f < 1 ? "·" : " ";
        s.textContent = on ? glyph : " ";
      });
      const out = ease.inOutCubic(prog(u, 4.4, 0.6));
      place(grid, 960, lerp(700, 1300, out), 1 - out * 0.6);
      place(wins, 960, lerp(250, -200, out), fin(u, 0.9, 0.4));
      place(losses, 960, lerp(390, -60, out), fin(u, 1.9, 0.4));
      nobody.textContent = decode("Nobody keeps score.", prog(u, 4.8, 0.7), 4);
      place(nobody, 960, 500, fin(u, 4.8, 0.2));
      sub.textContent = decode("so hunch does.", prog(u, 6.2, 0.5), 5);
      place(sub, 960, 640, fin(u, 6.2, 0.2));
      camera(st, { s: 1 + u * 0.006 });
    };
  });
}

export function title(parent: HTMLElement, a: number, b: number): Act {
  return act("title", parent, a, b, "ink", (st) => {
    const field = st.ascii(10, 18);
    const chip = el(st.cam, "chip", "");
    const tag = el(st.cam, "tagline", "");
    const kick = el(st.cam, "mono label", "");
    let mask: Float32Array | null = null;
    sfx(a + 4, "glitch", 0.6);
    keys(a + 4.6, 31, 1.4, 0.35);
    return (_t, u) => {
      mask ??= textMask(field, "hunch", { size: 560, y: 470, weight: 500 });
      const m = mask;
      field.clear();
      const reveal = ease.outCubic(prog(u, 0.1, 1.8));
      const collapse = ease.inExpo(prog(u, 3.6, 0.5));
      const glow = ease.inCubic(prog(u, 6.2, 1.8));
      field.paint((x, y, i, j) => {
        const inside = m[j * field.cols + i] ?? 0;
        const n = fbm(x * 0.006, y * 0.01, u * 0.5);
        const front = i / field.cols - reveal * 1.25 + n * 0.25;
        const shown = front < 0 ? 1 : 0;
        const band = Math.exp(-(((x / 1920 - ((u * 0.35) % 1.4)) * 9) ** 2));
        const word = inside * shown * (0.45 + 0.55 * n + band * 0.4) * (1 - collapse);
        const dust =
          clamp((n - 0.62) * 2.5) * 0.35 * (1 - collapse * 0.5) + glow * clamp(n * 1.3 - 0.2);
        return Math.max(word, dust * (1 - inside));
      }, FG.ink);
      chip.textContent = decode("hunch", prog(u, 3.9, 0.5), 7);
      place(chip, 960, 470, fin(u, 3.9, 0.15));
      tag.textContent = typed("Test your hunch before you bet.", prog(u, 4.6, 1.4));
      place(tag, 960, 700, fin(u, 4.6, 0.2));
      kick.textContent = decode("walrus × tatum · total recall · track 1", prog(u, 5.4, 0.7), 8);
      place(kick, 960, 860, fin(u, 5.4, 0.2));
      camera(st, { s: 1 + u * 0.01 + glow * 0.06 });
    };
  });
}

export function split(parent: HTMLElement, a: number, b: number): Act {
  const g = data().featured;
  const tip = g.startsAt.slice(11, 16);
  const NAMES: Record<string, string> = {
    books: "the books",
    polymarket: "polymarket",
    kalshi: "kalshi",
  };
  const ps = g.prices.filter((p) => p.fresh).slice(0, 3);
  const vals = ps.map((p) => p.homeProb * 100);
  const gap = Math.max(...vals) - Math.min(...vals);
  return act("one game, three prices", parent, a, b, "paper", (st) => {
    const kick = el(
      st.cam,
      "mono label",
      `tonight · ${g.title} · tip-off ${tip} utc · ${g.homeName.toLowerCase()} to win`,
    );
    const cols = ps.map((p, i) => {
      const land = 0.5 + i * BEAT;
      sfx(a + land, "thud", 0.6);
      return {
        p,
        land,
        x: 420 + i * 540,
        name: el(st.cam, "mono label", NAMES[p.source] ?? p.source),
        num: el(st.cam, "number"),
        line: el(st.cam, "mono sparkline"),
        meter: el(st.cam, "mono meter"),
      };
    });
    const gapLine = el(st.cam, "headline", `Same game. ${gap.toFixed(1)} points apart.`);
    const ask = el(st.cam, "headline xl", "");
    sfx(a + 4, "blip", 0.5);
    sfx(a + 5.5, "swish", 0.5);
    return (_t, u) => {
      place(kick, 960, 150, fin(u, 0, 0.3));
      const dimmed = 1 - 0.8 * ease.inOutCubic(prog(u, 5.4, 0.5));
      const r = rng(Math.floor(u * 32));
      for (const c of cols) {
        const landed = u >= c.land;
        c.num.innerHTML = "";
        h("span", "", c.num).textContent = landed
          ? (c.p.homeProb * 100).toFixed(1)
          : (10 + r() * 89).toFixed(1);
        h("span", "unit", c.num).textContent = "%";
        place(c.name, c.x, 330, fin(u, 0.1 + c.land * 0.3) * dimmed);
        place(c.num, c.x, 470, fin(u, 0.2, 0.2) * dimmed, {
          s: landed ? 1 + 0.06 * Math.exp(-(u - c.land) * 9) : 1,
        });
        c.line.textContent = spark(c.p.series, prog(u, 2, 1.6));
        place(c.line, c.x, 600, dimmed);
        c.meter.textContent = bar(c.p.homeProb * prog(u, c.land, 0.5), 22);
        place(c.meter, c.x, 660, fin(u, c.land) * dimmed);
      }
      place(gapLine, 960, 840, fin(u, 4, 0.4) * dimmed);
      ask.textContent = decode("Which one do you trust?", prog(u, 5.5, 0.6), 9);
      place(ask, 960, 520, fin(u, 5.5, 0.2));
      camera(st, { s: 1 + u * 0.008 + ease.inExpo(prog(u, 7.4, 0.6)) * 0.3 });
    };
  });
}

export function board(parent: HTMLElement, a: number, b: number): Act {
  const games = data().board.slice(0, 14);
  const prob = (g: (typeof games)[number], s: string) =>
    g.prices.find((p) => p.source === s)?.homeProb;
  const widest = Math.max(...games.map((g) => g.gap?.pts ?? 0));
  const cell = (p: number | undefined) =>
    p === undefined ? "  —  " : (p * 100).toFixed(1).padStart(5);
  return act("tonight", parent, a, b, "ink", (st) => {
    st.root.style.perspective = "1600px";
    const table = el(st.cam, "mono table");
    const head = h("div", "thead", table);
    head.textContent = `${"game".padEnd(11)}${"books".padStart(7)}${"poly".padStart(7)}${"kalshi".padStart(8)}   gap`;
    const rows = games.map((g, i) => {
      const row = h("div", "", table);
      const at = 0.3 + i * BEAT * 0.5;
      sfx(a + at, "tick", 0.3);
      const pts = g.gap?.pts ?? 0;
      const text = `${g.title.padEnd(11)}${cell(prob(g, "books")).padStart(7)}${cell(prob(g, "polymarket")).padStart(7)}${cell(prob(g, "kalshi")).padStart(8)}   ${bar(pts / Math.max(widest, 0.1), 10, "▮", "·")} ${pts.toFixed(1)}`;
      if (pts === widest) row.classList.add("hot");
      return { row, at, text, i };
    });
    const hk = el(st.cam, "headline xl", "");
    const sub = el(st.cam, "mono label", "");
    sfx(a + 4.5, "glitch", 0.45);
    return (_t, u) => {
      for (const { row, at, text, i } of rows) {
        row.textContent = decode(text, prog(u, at, 0.45), i + 20);
        row.style.opacity = u < at ? "0" : "1";
      }
      head.style.opacity = String(fin(u, 0.1));
      const dim = 1 - 0.75 * ease.inOutCubic(prog(u, 4.3, 0.5));
      table.style.opacity = String(dim);
      table.style.transform = `translate(-50%, -50%) translate3d(${960 + Math.sin(u * 0.3) * 40}px, ${560 - u * 14}px, 0) rotateX(24deg) rotateZ(-5deg)`;
      hk.textContent = decode("Hunch keeps score.", prog(u, 4.5, 0.7), 11);
      place(hk, 960, 500, fin(u, 4.5, 0.2));
      sub.textContent = decode("every source · every game · every night", prog(u, 5.6, 0.7), 12);
      place(sub, 960, 620, fin(u, 5.6, 0.2));
      camera(st, { s: 1 + u * 0.01 });
    };
  });
}
