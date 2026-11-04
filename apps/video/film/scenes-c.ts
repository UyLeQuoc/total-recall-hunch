import { cellNoise, fbm, sphere, textMask } from "./ascii.ts";
import {
  type Act,
  act,
  bar,
  camera,
  data,
  decode,
  el,
  FG,
  fin,
  fout,
  HIT,
  pct,
  place,
} from "./kit.ts";
import { BEAT, clamp, ease, h, lerp, prog, s, sfx, typed } from "./lib.ts";

const VOICE: Record<string, string> = {
  polymarket: "polymarket",
  kalshi: "kalshi",
  books: "the books",
  "book:draftkings": "draftkings",
};

export function memory(parent: HTMLElement, a: number, b: number): Act {
  const d = data();
  const lines = d.memoryLines;
  const total = d.status.memoriesWritten;
  const voices = d.voices
    .filter((v) => v.ctx === "NBA moneyline" && VOICE[v.voice])
    .sort((x, y) => x.brier - y.brier);
  const best = Math.min(...voices.map((v) => v.brier));
  const pins = Array.from({ length: 14 }, (_, k) => ({
    lat: (cellNoise(k, 3, 1) - 0.5) * 2.4,
    lon: (cellNoise(k, 5, 2) - 0.5) * 2 * Math.PI,
  }));
  return act("walrus memory", parent, a, b, "ink", (st) => {
    const globe = st.ascii(10, 18);
    const head = el(st.cam, "headline md", "");
    const log = el(st.cam, "memlog");
    const items = lines.map((m, i) => {
      const row = h("div", "memline", log);
      h("div", "", row).textContent = m.text.split(" · trend=")[0] ?? m.text;
      h("div", "blob", row).textContent =
        `${m.namespace} · walrus mainnet · blob ${m.blobId ?? ""}`;
      return { row, i };
    });
    const count = el(st.cam, "number md teal");
    const countLabel = el(st.cam, "mono label", "memories written on walrus mainnet");
    const table = el(st.cam, "mono scores");
    const rows = voices.map((v, i) => {
      const at = 6.8 + i * BEAT;
      sfx(a + at, "blip", 0.35);
      return { v, at, row: h("div", v.brier === best ? "best" : "", table) };
    });
    const cap = el(
      st.cam,
      "mono label",
      "brier: lower is better · bar = edge over a coin flip (0.25)",
    );
    for (let k = 0; k < 14; k++) sfx(a + 0.6 + k * 0.22, "tick", 0.18);
    return (_t, u) => {
      const second = ease.inOutCubic(prog(u, 6, 0.9));
      globe.clear();
      const cx = lerp(620, 420, second);
      const cy = lerp(560, 600, second);
      const r = lerp(330, 260, second) * fin(u, 0, 1);
      const spin = u * 0.32;
      globe.paint((x, y) => {
        const p = sphere(x, y, cx, cy, r, spin);
        if (!p) return 0;
        const grid =
          Math.abs(Math.sin(p.lat * 6)) < 0.08 || Math.abs(Math.sin(p.lon * 6)) < 0.06 ? 0.35 : 0;
        return p.d + grid;
      }, FG.ink);
      globe.paint(
        (x, y) => {
          const p = sphere(x, y, cx, cy, r, spin);
          if (!p) return 0;
          for (const pin of pins) {
            const dl = Math.abs(p.lat - pin.lat);
            let dn = Math.abs(p.lon - pin.lon);
            if (dn > Math.PI) dn = 2 * Math.PI - dn;
            if (dl < 0.07 && dn < 0.09) return 1;
          }
          return 0;
        },
        HIT.ink,
        "  ●",
      );
      head.textContent =
        u < 6
          ? decode("Walrus Memory keeps who was right, on what.", prog(u, 0.2, 0.9), 4)
          : decode("Every morning, every voice is scored.", prog(u, 6.1, 0.7), 5);
      place(head, 960, 110, u < 6 ? fin(u, 0.2, 0.3) * fout(u, 5.6, 0.4) : fin(u, 6.1, 0.2));
      const scroll = u * 70;
      for (const { row, i } of items) {
        const y = 420 + i * 92 - scroll;
        const edge = clamp((y - 200) / 100) * clamp((1000 - y) / 100) * fin(u, 0.4 + i * 0.12, 0.3);
        place(row, 1010, y, edge * fout(u, 5.6, 0.5), { center: false });
      }
      count.textContent = String(Math.round(ease.outCubic(prog(u, 0.6, 3.2)) * total));
      place(count, cx, 950, fin(u, 0.6, 0.3) * fout(u, 5.6, 0.4));
      place(countLabel, cx, 1020, fin(u, 0.9, 0.3) * fout(u, 5.6, 0.4));
      for (const { v, at, row } of rows) {
        const k = ease.outCubic(prog(u, at, 0.6));
        const edge = ((0.25 - v.brier) / (0.25 - best + 0.012)) * k;
        row.textContent = `${(VOICE[v.voice] ?? v.voice).padEnd(11)} n=${String(v.n).padEnd(4)} ${v.brier.toFixed(4)}  ${bar(edge, 22)}`;
        row.style.opacity = String(fin(u, at, 0.2));
      }
      place(table, 1240, 560, u >= 6.5 ? 1 : 0);
      place(cap, 1240, 820, fin(u, 8.6, 0.4));
      camera(st, { s: 1 + u * 0.004 + ease.inExpo(prog(u, 11.3, 0.7)) * 0.25 });
    };
  });
}

export function learn(parent: HTMLElement, a: number, b: number): Act {
  const d = data();
  const curve = d.curve;
  const vals = curve.flatMap((p) => [p.call, p.plain, p.books]);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const X0 = 300;
  const X1 = 1620;
  const Y0 = 300;
  const Y1 = 760;
  const x = (i: number) => X0 + (i / Math.max(1, curve.length - 1)) * (X1 - X0);
  const y = (v: number) => Y1 - ((v - lo) / (hi - lo || 1)) * (Y1 - Y0);
  const last = curve.at(-1);
  const g = d.featured;
  const call = g.call;
  return act("it learns", parent, a, b, "paper", (st) => {
    const head = el(st.cam, "headline", "");
    const svg = s("svg", { width: 1920, height: 1080, viewBox: "0 0 1920 1080" }, st.cam);
    svg.classList.add("c");
    s(
      "line",
      { x1: X0 - 24, y1: Y1 + 30, x2: X1 + 24, y2: Y1 + 30, stroke: "#cfd1d5", "stroke-width": 2 },
      svg,
    );
    s(
      "line",
      { x1: X0 - 24, y1: Y0 - 30, x2: X0 - 24, y2: Y1 + 30, stroke: "#cfd1d5", "stroke-width": 2 },
      svg,
    );
    const cursor = s(
      "line",
      {
        x1: 0,
        y1: Y0 - 30,
        x2: 0,
        y2: Y1 + 30,
        stroke: "#141416",
        "stroke-width": 1.5,
        "stroke-dasharray": "4 6",
      },
      svg,
    );
    const dots = curve.map((p, i) => ({
      i,
      books: s("circle", { cx: x(i), cy: y(p.books), r: 3.5, fill: "#8e9097" }, svg),
      plain: s(
        "circle",
        { cx: x(i), cy: y(p.plain), r: 8, fill: "none", stroke: "#55575d", "stroke-width": 2 },
        svg,
      ),
      call: s("circle", { cx: x(i), cy: y(p.call), r: 7, fill: "#141416" }, svg),
    }));
    const hiL = el(st.cam, "mono small", hi.toFixed(3));
    const loL = el(st.cam, "mono small", lo.toFixed(3));
    const readout = el(st.cam, "mono readout");
    const legend = el(
      st.cam,
      "mono label",
      "·  the books      ○  plain average      ●  trust-weighted call      cumulative brier, lower is better",
    );
    const sum = el(st.cam, "mono summary");
    const kick = el(st.cam, "mono label", `tonight · ${g.title}`);
    const big = el(st.cam, "number xl");
    const cites = (call?.lines ?? []).map((l, i) => {
      const at = 7.2 + i * 1.1;
      sfx(a + at, "blip", 0.45);
      const box = el(st.cam, "cite");
      h("div", "say", box).textContent = `${i === 0 ? "" : "…"}${l.text}`;
      h("div", "mono blobline", box).textContent = l.cites
        ? `↳ recalled from walrus memory · blob ${l.cites.blobId}`
        : "";
      return { box, at, i };
    });
    const foot = el(st.cam, "mono label", "every weight links to the memory it came from");
    for (let k = 0; k < 16; k++) sfx(a + 0.5 + k * 0.28, "tick", 0.2);
    sfx(a + 6, "swish", 0.5);
    return (_t, u) => {
      const chartOut = ease.inOutCubic(prog(u, 5.8, 0.6));
      head.textContent = decode("It learns who to trust.", prog(u, 0.05, 0.6), 6);
      place(head, 960, 150, fin(u, 0.05, 0.2) * (1 - chartOut));
      const cx = lerp(X0 - 24, X1 + 24, ease.inOutCubic(prog(u, 0.5, 4.5)));
      cursor.setAttribute("x1", cx.toFixed(1));
      cursor.setAttribute("x2", cx.toFixed(1));
      cursor.style.opacity = String(u > 0.5 && u < 5.2 ? 1 : 0);
      let shown = 0;
      for (const dd of dots) {
        const on = x(dd.i) <= cx;
        if (on) shown = dd.i;
        for (const c of [dd.books, dd.plain, dd.call]) c.style.opacity = on ? "1" : "0";
      }
      svg.style.opacity = String(fin(u, 0.3, 0.4) * (1 - chartOut));
      place(hiL, X0 - 90, Y0 - 20, fin(u, 0.4) * (1 - chartOut));
      place(loL, X0 - 90, Y1, fin(u, 0.4) * (1 - chartOut));
      const cur = curve[shown];
      readout.textContent = cur
        ? `n=${cur.n}  call ${cur.call.toFixed(4)}  books ${cur.books.toFixed(4)}`
        : "";
      place(
        readout,
        Math.min(cx + 150, X1 - 120),
        Y0 - 50,
        (u > 0.6 && u < 5.2 ? 1 : 0) * (1 - chartOut),
      );
      place(legend, 960, 850, fin(u, 0.8) * (1 - chartOut));
      if (last)
        sum.textContent = decode(
          `after ${last.n} games · call ${last.call.toFixed(4)} · plain ${last.plain.toFixed(4)} · books ${last.books.toFixed(4)} · reported whichever way it falls`,
          prog(u, 4.9, 0.6),
          13,
        );
      place(sum, 960, 930, fin(u, 4.9, 0.2) * (1 - chartOut));
      place(kick, 960, 250, fin(u, 6.1, 0.3));
      big.innerHTML = "";
      h("span", "xl-call muted", big).textContent = "the agent's call  ";
      h("span", "", big).textContent =
        `${g.home} ${call ? pct(call.homeProb * fin(u, 6.2, 0.8)) : "—"}`;
      place(big, 960, 380, fin(u, 6.2, 0.3));
      for (const { box, at, i } of cites)
        place(box, 960 + (1 - fin(u, at, 0.5)) * 120, 570 + i * 160, fin(u, at, 0.3));
      place(foot, 960, 930, fin(u, 9.6, 0.4));
      camera(st, { s: 1 + u * 0.005 });
    };
  });
}

export function proven(parent: HTMLElement, a: number, b: number): Act {
  return act("proven", parent, a, b, "ink", (st) => {
    const field = st.ascii(10, 18);
    const sub = el(st.cam, "tagline", "");
    const fine = el(st.cam, "mono label", "");
    let mask: Float32Array | null = null;
    sfx(a + 0.1, "glitch", 0.6);
    sfx(a + 0.9, "shimmer", 0.5);
    return (_t, u) => {
      mask ??= textMask(field, "PROVEN", { size: 330, y: 470, weight: 700 });
      const m = mask;
      field.clear();
      const p = ease.outCubic(prog(u, 0.1, 0.9));
      field.paint((x, y, i, j) => {
        const inside = m[j * field.cols + i] ?? 0;
        const n = cellNoise(i, j, Math.floor(u * 20));
        const on = cellNoise(i, j, 3) < p * 1.1;
        const flick = u < 1.2 ? (n > 0.85 ? 0.4 : 1) : 1;
        const noise = fbm(x * 0.008, y * 0.012, u * 0.6);
        return inside > 0.2 && on ? (0.55 + noise * 0.45) * flick : clamp((noise - 0.7) * 2) * 0.25;
      }, HIT.ink);
      sub.textContent = typed(
        "20+ picks on record · a better Brier than its market",
        prog(u, 1.4, 1.2),
      );
      place(sub, 960, 780, fin(u, 1.4, 0.2));
      fine.textContent = decode(
        "earned on the record, never claimed after the fact",
        prog(u, 2.4, 0.6),
        21,
      );
      place(fine, 960, 860, fin(u, 2.4, 0.2));
      camera(st, { s: 1 + u * 0.02 });
    };
  });
}

export function hood(parent: HTMLElement, a: number, b: number): Act {
  const d = data();
  const shots: Array<[string, number]> = [
    ["hunch-full", 360],
    ["research-full", 1050],
    ["verify", 180],
    ["learning-full", 380],
    ["status", 180],
    ["games", 180],
  ];
  const tiles: Array<[string, number, string, string]> = [
    [
      "",
      d.status.anchorBatches,
      "pick batches anchored on sui testnet",
      "hunch::anchor · merkle roots",
    ],
    ["grpc", 0, "every sui call goes through tatum", "paced · metered · never json-rpc"],
    [
      "",
      d.status.memoriesWritten,
      "memories written on walrus mainnet",
      "trust lines · splits · rules",
    ],
    [
      "",
      d.curve.length,
      "nba games scored, every voice",
      `${d.status.backfillGames} games of stored prices`,
    ],
    ["", 5, "data sources, none through tatum", "espn · polymarket · kalshi · odds api · coinbase"],
    ["", d.tests, "tests passing", "bun run test"],
  ];
  return act("under the hood", parent, a, b, "paper", (st) => {
    st.root.style.perspective = "1800px";
    const wall = el(st.cam, "wall");
    const frames = shots.map(([name, offset], i) => {
      const f = h("div", "frame", wall);
      const top = h("div", "fbar", f);
      for (let j = 0; j < 3; j++) h("i", "dot", top);
      const view = h("div", "view", f);
      const img = h("img", "", view);
      img.src = `/shots/${name}.png`;
      const zoom = 860 / 1500;
      img.style.cssText = `width:${2880 * zoom}px;max-width:none;margin-left:${-690 * zoom}px;margin-top:${-offset * zoom}px`;
      sfx(a + 0.2 + i * 0.25, "swish", 0.3);
      return { f, i };
    });
    const tileEls = tiles.map(([word, value, label, small], i) => {
      const t = el(st.cam, "tile");
      const num = h("b", "", t);
      h("span", "", t).textContent = label;
      h("em", "", t).textContent = small;
      const at = 5.2 + i * BEAT * 0.5;
      sfx(a + at, "pop", 0.35);
      return { t, num, word, value, at, i };
    });
    const flow = el(st.cam, "mono label");
    return (_t, u) => {
      const wallOut = ease.inOutCubic(prog(u, 4.6, 0.6));
      for (const { f, i } of frames) {
        const k = ease.outExpo(prog(u, 0.2 + i * 0.25, 0.6));
        f.style.transform = `translate(${(i % 3) * 940}px, ${Math.floor(i / 3) * 640}px) translateZ(${(1 - k) * 600}px)`;
        f.style.opacity = String(k);
      }
      wall.style.opacity = String(1 - wallOut);
      wall.style.transform = `translate(-50%, -50%) translate3d(${lerp(1300, 620, ease.inOutCubic(prog(u, 0, 4.6)))}px, ${lerp(700, 420, ease.inOutCubic(prog(u, 0, 4.6)))}px, 0) rotateX(52deg) rotateZ(-24deg) scale(0.8)`;
      for (const { t, num, word, value, at, i } of tileEls) {
        const k = ease.outCubic(prog(u, at, 0.8));
        num.textContent = word || String(Math.round(value * k));
        place(t, 380 + (i % 3) * 580, 380 + Math.floor(i / 3) * 290, fin(u, at, 0.3), {
          s: lerp(0.9, 1, fin(u, at, 0.5)),
        });
      }
      flow.textContent = typed(
        "web → api → tatum grpc → sui testnet    ·    api → walrus relayer → walrus mainnet",
        prog(u, 7.2, 1.4),
      );
      place(flow, 960, 960, fin(u, 7.2, 0.2));
      camera(st, { s: 1 + u * 0.004 });
    };
  });
}

export function end(parent: HTMLElement, a: number, b: number): Act {
  return act("end", parent, a, b, "ink", (st) => {
    const field = st.ascii();
    const chip = el(st.cam, "chip", "");
    const tag = el(st.cam, "tagline", "");
    const url = el(st.cam, "mono url", "");
    const built = el(st.cam, "mono label", "");
    const kick = el(st.cam, "mono label", "");
    const black = el(st.cam, "black");
    sfx(a + 2, "glitch", 0.5);
    for (let k = 0; k < 14; k++) sfx(a + 2.6 + k * 0.08, "type", 0.3);
    return (_t, u) => {
      field.clear();
      const collapse = ease.inExpo(prog(u, 1.4, 0.6));
      const speed = lerp(2.2, 0.4, ease.outCubic(prog(u, 0, 2)));
      if (collapse < 1)
        field.paint((x, y) => {
          const dx = x - 960;
          const dy = (y - 540) * 1.6;
          const rr = Math.hypot(dx, dy);
          if (rr < 40) return 0;
          const z = 26000 / rr + u * speed * 60;
          const ang = Math.atan2(dy, dx) / Math.PI;
          const line =
            Math.abs(((z / 40) % 1) - 0.5) < 0.08 || Math.abs(((ang * 12 + 100) % 1) - 0.5) < 0.05
              ? 0.8
              : 0.12;
          return line * clamp(rr / 500) * (1 - collapse);
        }, FG.ink);
      chip.textContent = decode("hunch", prog(u, 2, 0.5), 9);
      place(chip, 960, 430, fin(u, 2, 0.15) * fout(u, 8.4, 1.2));
      tag.textContent = typed("Test your hunch before you bet.", prog(u, 2.6, 1.1));
      place(tag, 960, 650, fin(u, 2.6, 0.2) * fout(u, 6, 0.6));
      url.textContent = decode("testyourhunch.vercel.app", prog(u, 3.6, 0.6), 10);
      place(url, 960, 760, fin(u, 3.6, 0.2) * fout(u, 6, 0.6));
      built.textContent = decode("built on sui · tatum · walrus memory", prog(u, 4.2, 0.6), 11);
      place(built, 960, 830, fin(u, 4.2, 0.2) * fout(u, 6, 0.6));
      kick.textContent = decode(
        "walrus × tatum · total recall · track 1 · github.com/UyLeQuoc/total-recall-hunch",
        prog(u, 4.7, 0.7),
        12,
      );
      place(kick, 960, 960, fin(u, 4.7, 0.2) * fout(u, 6, 0.6));
      black.style.opacity = String(ease.inCubic(prog(u, 8.2, 1.6)));
      camera(st, { s: 1 + u * 0.006 });
    };
  });
}
