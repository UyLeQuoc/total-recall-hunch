import {
  bar,
  bigType,
  camera,
  data,
  fadeIn,
  kicker,
  pct,
  popIn,
  scene,
  shake,
  slam,
  text,
  typeSounds,
} from "./kit.ts";
import { BEAT, ease, h, lerp, pose, prog, type Scene, s, sfx } from "./lib.ts";

const BAR = BEAT * 4;
const VOICE: Record<string, string> = {
  polymarket: "Polymarket",
  kalshi: "Kalshi",
  books: "the books",
  "book:draftkings": "DraftKings",
};

export function scored(parent: HTMLElement, a: number, b: number): Scene {
  const voices = data()
    .voices.filter((v) => v.ctx === "NBA moneyline" && VOICE[v.voice])
    .sort((x, y) => x.brier - y.brier);
  const best = Math.min(...voices.map((v) => v.brier));
  return scene("scored", parent, a, b, "light", (st) => {
    const k = kicker(st.cam, "Every morning · NBA moneyline");
    const head = bigType(st.cam, "Every voice gets scored.", { size: 120 });
    typeSounds(a + 0.1, 21, 0.035, 4);
    const rows = voices.map((v, i) => {
      const at = a + BEAT * 3 + i * BEAT * 0.9;
      sfx(at, "tick", 0.7);
      return { v, at, el: text(st.cam, "row", "", "font-size:40px") };
    });
    const cap = text(
      st.cam,
      "mono g3",
      "Brier score: lower is better · the bar is the edge over a coin flip (0.25)",
      "font-size:26px",
    );
    return (t) => {
      camera(st, t, a, { push: 0.01, diveAt: b - 0.45, diveEnd: b });
      pose(k, { x: 960, y: 140, o: fadeIn(t, a) });
      pose(head.el, { x: 960, y: 250 });
      head.render(t, a + 0.1, 0.035);
      rows.forEach(({ v, at, el }, i) => {
        const grow = ease.outCubic(prog(t, at, 0.7));
        const edge = ((0.25 - v.brier) / (0.25 - best + 0.01)) * grow;
        el.textContent = `${(VOICE[v.voice] ?? v.voice).padEnd(11)} n=${String(v.n).padEnd(4)} ${v.brier.toFixed(4)}  ${bar(edge, 24)}`;
        el.style.fontWeight = v.brier === best ? "700" : "400";
        pose(el, { x: 960, y: 430 + i * 92, o: fadeIn(t, at, 0.2) });
      });
      pose(cap, { x: 960, y: 880, o: fadeIn(t, a + BEAT * 8) });
    };
  });
}

export function memory(parent: HTMLElement, a: number, b: number): Scene {
  const d = data();
  const lines = d.memoryLines.slice(0, 5);
  const total = d.status.memoriesWritten;
  return scene("memory", parent, a, b, "dark", (st) => {
    const l1 = bigType(st.cam, "Walrus Memory keeps", { size: 104 });
    const l2 = bigType(st.cam, "who was right, on what.", { size: 104 });
    typeSounds(a + 0.1, 18, 0.035, 4);
    typeSounds(a + 0.1 + BEAT * 1.5, 20, 0.035, 4);
    const boxes = lines.map((m, i) => {
      const el = h("div", "c mem", st.cam);
      h("div", "", el).textContent = m.text.split(" · trend=")[0] ?? m.text;
      h("div", "blob", el).textContent =
        `${m.namespace} · on Walrus mainnet · blob ${m.blobId ?? ""}`;
      const at = a + BEAT * 3.2 + i * BEAT * 0.95;
      sfx(at, "blip", 0.55);
      return { el, at, i };
    });
    const count = h("div", "c", st.cam);
    count.style.cssText += "font-size:150px;font-weight:800;letter-spacing:-0.05em;color:#7ce8d6;";
    const label = text(
      st.cam,
      "sub",
      "memories written\non Walrus mainnet",
      "font-size:32px;white-space:pre;text-align:center",
    );
    const countAt = a + BEAT * 3.2;
    for (let i = 0; i < 12; i++) sfx(countAt + i * 0.2, "tick", 0.35);
    sfx(countAt + 2.5, "shimmer", 0.5);
    return (t) => {
      camera(st, t, a, { push: 0.01, diveAt: b - 0.45, diveEnd: b, diveTo: [1660, 640] });
      pose(l1.el, { x: 960, y: 140 });
      l1.render(t, a + 0.1, 0.035);
      pose(l2.el, { x: 960, y: 255 });
      l2.render(t, a + 0.1 + BEAT * 1.5, 0.035);
      for (const { el, at, i } of boxes) {
        const k = fadeIn(t, at, 0.5);
        pose(el, { x: 110 + (1 - k) * 120, y: 380 + i * 128, center: false, o: k });
      }
      const n = Math.round(ease.outCubic(prog(t, countAt, 2.5)) * total);
      count.textContent = String(n);
      pose(count, {
        x: 1660,
        y: 600,
        o: fadeIn(t, countAt, 0.3),
        s: lerp(0.8, 1, fadeIn(t, countAt, 0.6)),
      });
      pose(label, { x: 1660, y: 730, o: fadeIn(t, countAt + 0.4, 0.4) });
    };
  });
}

export function call(parent: HTMLElement, a: number, b: number): Scene {
  const g = data().featured;
  const c = g.call;
  const lines = c?.lines ?? [];
  return scene("call", parent, a, b, "light", (st) => {
    const k = kicker(st.cam, `Tonight · ${g.title}`);
    const head = bigType(st.cam, `The agent's call: ${g.home} ${c ? pct(c.homeProb) : "—"}`, {
      size: 100,
    });
    typeSounds(a + 0.1, 24, 0.035, 4);
    const items = lines.map((l, i) => {
      const el = h("div", "c", st.cam);
      const say = h("div", "", el);
      say.textContent = `${i === 0 ? "" : "…"}${l.text}`;
      say.style.cssText =
        "font-size:48px;font-weight:600;letter-spacing:-0.02em;white-space:nowrap";
      const cite = h("div", "mono hit", el);
      cite.textContent = l.cites ? `↳ recalled from Walrus Memory · blob ${l.cites.blobId}` : "";
      cite.style.cssText = "font-size:26px;margin-top:12px;white-space:nowrap";
      const at = a + BEAT * 3 + i * BEAT * 2;
      sfx(at, "swish", 0.6);
      sfx(at + 0.4, "blip", 0.5);
      return { el, at, i };
    });
    const cap = text(
      st.cam,
      "sub",
      "Every weight on screen links to the memory it came from.",
      "font-size:44px",
    );
    return (t) => {
      camera(st, t, a, { push: 0.01 });
      pose(k, { x: 960, y: 140, o: fadeIn(t, a) });
      pose(head.el, { x: 960, y: 260 });
      head.render(t, a + 0.1, 0.035);
      for (const { el, at, i } of items) {
        const kk = fadeIn(t, at, 0.5);
        pose(el, { x: 960 + (1 - kk) * 80, y: 470 + i * 170, o: kk });
      }
      pose(cap, { x: 960, y: 880, o: fadeIn(t, a + BEAT * 8.5, 0.5) });
    };
  });
}

export function learning(parent: HTMLElement, a: number, b: number): Scene {
  const curve = data().curve;
  const vals = curve.flatMap((p) => [p.call, p.plain, p.books]);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const X0 = 300;
  const X1 = 1640;
  const Y0 = 330;
  const Y1 = 780;
  const x = (i: number) => X0 + (i / Math.max(1, curve.length - 1)) * (X1 - X0);
  const y = (v: number) => Y1 - ((v - lo) / (hi - lo || 1)) * (Y1 - Y0);
  const last = curve.at(-1);
  return scene("learning", parent, a, b, "dark", (st) => {
    const head = bigType(st.cam, "It learns who to trust.", { size: 110 });
    typeSounds(a + 0.1, 20, 0.035, 4);
    const svg = s("svg", { width: 1920, height: 1080, viewBox: "0 0 1920 1080" }, st.cam);
    svg.classList.add("c");
    s(
      "line",
      { x1: X0 - 20, y1: Y1 + 30, x2: X1 + 20, y2: Y1 + 30, stroke: "#55575d", "stroke-width": 2 },
      svg,
    );
    s(
      "line",
      { x1: X0 - 20, y1: Y0 - 20, x2: X0 - 20, y2: Y1 + 30, stroke: "#55575d", "stroke-width": 2 },
      svg,
    );
    const yHi = text(st.cam, "mono g3", hi.toFixed(3), "font-size:24px");
    const yLo = text(st.cam, "mono g3", lo.toFixed(3), "font-size:24px");
    const drawFrom = a + 0.6;
    const drawFor = BAR * 2;
    const dots = curve.map((p, i) => {
      const at = drawFrom + (i / curve.length) * drawFor;
      if (i % 5 === 0) sfx(at, "tick", 0.3);
      return {
        at,
        books: s("circle", { cx: x(i), cy: y(p.books), r: 3, fill: "#8e9097" }, svg),
        plain: s(
          "circle",
          { cx: x(i), cy: y(p.plain), r: 7, fill: "none", stroke: "#b4b6bc", "stroke-width": 2 },
          svg,
        ),
        call: s("circle", { cx: x(i), cy: y(p.call), r: 7, fill: "#ececef" }, svg),
      };
    });
    const legend = text(
      st.cam,
      "mono g3",
      "·  the books     ○  plain average     ●  trust-weighted call",
      "font-size:26px",
    );
    const sum = h("div", "c sub", st.cam);
    sum.style.fontSize = "40px";
    if (last)
      sum.innerHTML = `After ${last.n} games: the call <b style="color:#fff">${last.call.toFixed(4)}</b> · the books ${last.books.toFixed(4)} · reported whichever way it falls`;
    sfx(a + BAR * 2.9, "ding", 0.5);
    return (t) => {
      camera(st, t, a, { push: 0.008, diveAt: b - 0.45, diveEnd: b });
      pose(head.el, { x: 960, y: 170 });
      head.render(t, a + 0.1, 0.035);
      svg.style.opacity = String(fadeIn(t, a + 0.4, 0.4));
      for (const d of dots) {
        const on = t >= d.at ? 1 : 0;
        const k = popIn(t, d.at);
        for (const c of [d.books, d.plain, d.call]) {
          c.style.opacity = String(on);
          c.style.transformOrigin = `${c.getAttribute("cx")}px ${c.getAttribute("cy")}px`;
          c.style.transform = `scale(${Math.max(0, k).toFixed(3)})`;
        }
      }
      pose(yHi, { x: X0 - 90, y: Y0 - 20, o: fadeIn(t, a + 0.4) });
      pose(yLo, { x: X0 - 90, y: Y1, o: fadeIn(t, a + 0.4) });
      pose(legend, { x: 960, y: 880, o: fadeIn(t, a + 1) });
      pose(sum, { x: 960, y: 960, o: fadeIn(t, a + BAR * 2.9, 0.5) });
    };
  });
}

export function proven(parent: HTMLElement, a: number, b: number): Scene {
  return scene("proven", parent, a, b, "light", (st) => {
    const badge = text(st.cam, "badge", "PROVEN");
    const sub = bigType(st.cam, "20+ picks on record. A better Brier than its market.", {
      size: 54,
      weight: 700,
      by: "words",
    });
    const fine = text(
      st.cam,
      "mono g3",
      "earned on the record, never claimed after the fact",
      "font-size:26px",
    );
    sfx(a + 0.15, "impact", 0.8);
    typeSounds(a + BEAT * 2, 10, 0.06, 1, 0.3);
    return (t) => {
      camera(st, t, a, { push: 0.012 });
      const [sx, sy] = shake(t, a + 0.15, 16);
      pose(badge, {
        x: 960 + sx,
        y: 420 + sy,
        r: -4,
        s: slam(t, a + 0.15, 2.8),
        o: t >= a + 0.15 ? 1 : 0,
      });
      pose(sub.el, { x: 960, y: 700 });
      sub.render(t, a + BEAT * 2, 0.06);
      pose(fine, { x: 960, y: 800, o: fadeIn(t, a + BEAT * 4.5) });
    };
  });
}

export function montage(parent: HTMLElement, a: number, b: number): Scene {
  const shots: Array<[string, string, number]> = [
    ["hunch-full", "/", 360],
    ["research-full", "/games", 1050],
    ["verify", `/p/${data().proof.id}`, 180],
    ["learning-full", "/learning", 380],
    ["status", "/status", 180],
    ["games", "/games", 180],
  ];
  const zoom = 1300 / 1500;
  return scene("montage", parent, a, b, "dark", (st) => {
    const k = kicker(st.cam, "Live now · testyourhunch.vercel.app");
    const frames = shots.map(([name, path, offset], i) => {
      const el = h("div", "c frame", st.cam);
      el.style.width = "1300px";
      const top = h("div", "bar", el);
      for (let j = 0; j < 3; j++) h("i", "", top);
      h("span", "url", top).textContent = `testyourhunch.vercel.app${path === "/" ? "" : path}`;
      const view = h("div", "", el);
      view.style.cssText = "height:814px;overflow:hidden;background:#f7f7f7";
      const img = h("img", "", view);
      img.src = `/shots/${name}.png`;
      img.style.cssText = `width:${2880 * zoom}px;max-width:none;margin-left:${-690 * zoom}px;margin-top:${-offset * zoom}px`;
      const at = a + 0.15 + i * (BAR / 2);
      sfx(at, "swish", 0.55);
      return { el, at, i };
    });
    return (t) => {
      camera(st, t, a, { push: 0.01 });
      pose(k, { x: 960, y: 70, o: fadeIn(t, a) });
      const current = frames.filter((f) => t >= f.at).length - 1;
      for (const f of frames) {
        const kk = ease.outExpo(prog(t, f.at, 0.55));
        const behind = Math.max(0, current - f.i);
        f.el.style.zIndex = String(10 + f.i);
        pose(f.el, {
          x: 960 + (f.i % 2 ? 1 : -1) * (1 - kk) * 260 - behind * 18,
          y: lerp(1500, 575, kk) - behind * 22,
          r: (f.i % 2 ? 1 : -1) * (1 - kk) * 6,
          s: 0.98 - behind * 0.035,
          o: t < f.at ? 0 : Math.max(0, 1 - behind * 0.28),
        });
      }
    };
  });
}

export function hood(parent: HTMLElement, a: number, b: number): Scene {
  const d = data();
  const tiles: Array<[string, string, string]> = [
    [
      String(d.status.anchorBatches),
      "pick batches anchored on Sui testnet",
      "hunch::anchor · Merkle roots",
    ],
    ["gRPC", "every Sui call goes through Tatum", "paced · metered · never JSON-RPC"],
    [
      String(d.status.memoriesWritten),
      "memories written on Walrus mainnet",
      "trust lines · splits · rules",
    ],
    [
      String(d.curve.length),
      "NBA games scored, every voice",
      `${d.status.backfillGames} games of stored prices`,
    ],
    ["5", "data sources, none through Tatum", "ESPN, Polymarket, Kalshi, Odds API, Coinbase"],
    [String(d.tests), "tests passing", "bun run test"],
  ];
  return scene("hood", parent, a, b, "dark", (st) => {
    const head = bigType(st.cam, "Under the hood", { size: 100 });
    typeSounds(a + 0.1, 13, 0.035, 4);
    const els = tiles.map(([big, label, small], i) => {
      const el = h("div", "c tile", st.cam);
      h("b", "", el).textContent = big;
      h("span", "", el).textContent = label;
      h("em", "", el).textContent = small;
      const at = a + BEAT * 1.6 + i * BEAT * 0.8;
      sfx(at, "pop", 0.5);
      return { el, at, x: 380 + (i % 3) * 580, y: 460 + Math.floor(i / 3) * 280 };
    });
    return (t) => {
      camera(st, t, a, { push: 0.01, diveAt: b - 0.45, diveEnd: b });
      pose(head.el, { x: 960, y: 170 });
      head.render(t, a + 0.1, 0.035);
      for (const { el, at, x, y } of els) {
        const k = popIn(t, at);
        pose(el, {
          x,
          y: y + (1 - Math.min(1, k)) * 40,
          s: lerp(0.85, 1, k),
          o: t >= at ? Math.min(1, k * 2) : 0,
        });
      }
    };
  });
}

export function end(parent: HTMLElement, a: number, b: number): Scene {
  return scene("end", parent, a, b, "light", (st) => {
    const chip = text(st.cam, "chip", "hunch", "font-size:200px;font-weight:500");
    const line = bigType(st.cam, "Test your hunch before you bet.", {
      size: 78,
      weight: 700,
      by: "words",
    });
    const url = text(st.cam, "mono", "testyourhunch.vercel.app", "font-size:40px");
    const repo = text(
      st.cam,
      "mono g3",
      "github.com/UyLeQuoc/total-recall-hunch · MIT",
      "font-size:26px",
    );
    const k = kicker(st.cam, "Walrus × Tatum · Total Recall · Track 1");
    sfx(a + 0.1, "impact", 0.6);
    typeSounds(a + BEAT * 2, 6, 0.08, 1, 0.3);
    sfx(a + BEAT * 2.6, "shimmer", 0.6);
    return (t) => {
      camera(st, t, a, { push: 0.008 });
      pose(chip, { x: 960, y: 360, s: slam(t, a + 0.1, 2.4), o: t >= a + 0.1 ? 1 : 0 });
      pose(line.el, { x: 960, y: 600 });
      line.render(t, a + BEAT * 2, 0.08);
      pose(url, { x: 960, y: 740, o: fadeIn(t, a + BEAT * 4.5) });
      pose(repo, { x: 960, y: 800, o: fadeIn(t, a + BEAT * 5) });
      pose(k, { x: 960, y: 950, o: fadeIn(t, a + BEAT * 5.5) });
    };
  });
}
