import {
  bar,
  bigType,
  camera,
  data,
  fadeIn,
  fadeOut,
  keySounds,
  kicker,
  pct,
  scene,
  shake,
  slam,
  text,
  typeSounds,
} from "./kit.ts";
import { BEAT, ease, h, lerp, pose, prog, type Scene, scramble, sfx, typed } from "./lib.ts";

const BAR = BEAT * 4;

export function open(parent: HTMLElement, a: number, b: number): Scene {
  return scene("open", parent, a, b, "dark", (st) => {
    const l1 = bigType(st.cam, "Everyone", { size: 210 });
    const l2 = bigType(st.cam, "has a hunch.", { size: 210 });
    typeSounds(a + 0.1, 8, 0.04);
    typeSounds(a + 0.1 + BEAT * 2, 11, 0.04);
    const quotes = [
      "“Polymarket overprices NBA favourites.”",
      "“The books are sharper than Kalshi.”",
      "“Kalshi gets the Senate right.”",
    ].map((q, i) => {
      const at = a + BAR * 1.4 + i * BEAT * 1.3;
      keySounds(at, q.length, 0.7, 0.45);
      return { q, at, el: text(st.cam, "quote", "") };
    });
    return (t) => {
      camera(st, t, a, { push: 0.014, diveAt: b - 0.55, diveEnd: b });
      const out = ease.inOutCubic(prog(t, a + BAR * 1.3, 0.55));
      pose(l1.el, { x: 960, y: lerp(430, 190, out), s: lerp(1, 0.42, out), o: lerp(1, 0.4, out) });
      pose(l2.el, { x: 960, y: lerp(650, 290, out), s: lerp(1, 0.42, out), o: lerp(1, 0.4, out) });
      l1.render(t, a + 0.1);
      l2.render(t, a + 0.1 + BEAT * 2);
      quotes.forEach(({ q, at, el }, i) => {
        el.textContent = typed(q, prog(t, at, 0.7));
        pose(el, { x: 960 + (i - 1) * 60, y: 520 + i * 125, o: fadeIn(t, at, 0.15) });
      });
    };
  });
}

export function problem(parent: HTMLElement, a: number, b: number): Scene {
  return scene("problem", parent, a, b, "light", (st) => {
    const wins = bigType(st.cam, "Wins stick.", { size: 190 });
    const losses = bigType(st.cam, "Losses fade.", { size: 190 });
    const ledger = h("div", "c mono", st.cam);
    ledger.style.cssText += "font-size:64px;letter-spacing:.3em;white-space:nowrap;font-weight:500";
    const marks = "WLWWLLWLWWL".split("").map((m) => {
      const span = h("span", m === "L" ? "miss" : "", ledger);
      span.textContent = m;
      return span;
    });
    const nobody = bigType(st.cam, "Nobody keeps score.", { size: 150 });
    sfx(a + 0.1, "thud", 0.8);
    typeSounds(a + 0.1 + BEAT * 2, 11, 0.04);
    sfx(a + BEAT * 8.5, "impact", 0.7);
    typeSounds(a + BEAT * 8.5, 18, 0.03, 4);
    return (t) => {
      camera(st, t, a, { push: 0.01 });
      const gone = fadeOut(t, a + BEAT * 8, 0.35);
      const fade = (i: number) =>
        lerp(1, 0.08, ease.inOutCubic(prog(t, a + BEAT * 5 + i * 0.07, 0.6)));
      pose(wins.el, { x: 960, y: 300, o: gone });
      wins.render(t, a + 0.1);
      pose(losses.el, { x: 960, y: 520, o: gone });
      losses.render(t, a + 0.1 + BEAT * 2);
      losses.pieces.forEach((p, i) => {
        p.style.opacity = String(Number(p.style.opacity || 1) * fade(i));
      });
      pose(ledger, { x: 960, y: 760, o: gone * fadeIn(t, a + BEAT * 4, 0.4) });
      marks.forEach((m, i) => {
        m.style.opacity = m.classList.contains("miss") ? String(fade(i)) : "";
      });
      pose(nobody.el, { x: 960, y: 540, s: 1 + (t - a) * 0.01 });
      nobody.render(t, a + BEAT * 8.5, 0.03);
    };
  });
}

export function title(parent: HTMLElement, a: number, b: number): Scene {
  return scene("title", parent, a, b, "dark", (st) => {
    const chip = text(st.cam, "chip", "hunch", "font-size:220px;font-weight:500");
    const sub = bigType(st.cam, "Test your hunch before you bet.", {
      size: 66,
      weight: 600,
      by: "words",
    });
    const k = kicker(st.cam, "Walrus × Tatum · Total Recall · Track 1");
    sfx(a + 0.2, "impact", 0.9);
    typeSounds(a + BEAT * 3, 6, 0.08, 1, 0.3);
    return (t) => {
      camera(st, t, a, {
        push: 0.012,
        diveAt: b - 0.5,
        diveEnd: b,
        diveTo: [960, 400],
        diveScale: 18,
      });
      const [sx, sy] = shake(t, a + 0.2, 18);
      pose(chip, { x: 960 + sx, y: 400 + sy, s: slam(t, a + 0.2, 3.2), o: t < a + 0.2 ? 0 : 1 });
      pose(sub.el, { x: 960, y: 690 });
      sub.render(t, a + BEAT * 3, 0.08);
      pose(k, { x: 960, y: 880, o: fadeIn(t, a + BEAT * 5, 0.5) });
    };
  });
}

export function sources(parent: HTMLElement, a: number, b: number): Scene {
  const g = data().featured;
  const tip = g.startsAt.slice(11, 16);
  const names: Record<string, string> = {
    books: "the books",
    polymarket: "Polymarket",
    kalshi: "Kalshi",
  };
  const ps = g.prices.filter((p) => p.fresh);
  const vals = ps.map((p) => p.homeProb * 100);
  const lo = Math.floor(Math.min(...vals)) - 2;
  const hi = Math.ceil(Math.max(...vals)) + 1;
  const gap = Math.max(...vals) - Math.min(...vals);
  return scene("sources", parent, a, b, "light", (st) => {
    const k = kicker(st.cam, `Tonight · ${g.title} · tip-off ${tip} UTC`);
    const head = bigType(st.cam, "One game. Three prices.", { size: 124 });
    typeSounds(a + 0.1, 20, 0.035, 4);
    const rows = ps.map((p, i) => {
      const at = a + BEAT * 3 + i * BEAT;
      sfx(at, "tick", 0.7);
      return { p, at, el: text(st.cam, "row", "") };
    });
    const axis = text(
      st.cam,
      "mono g3",
      `${g.homeName} to win · axis ${lo}–${hi}%`,
      "font-size:26px",
    );
    const q = text(
      st.cam,
      "sub",
      `Same game, ${gap.toFixed(1)} points apart. Which one do you trust?`,
      "font-size:54px;font-weight:600;color:#141416",
    );
    sfx(a + BEAT * 8.5, "blip", 0.6);
    return (t) => {
      camera(st, t, a, { push: 0.01, diveAt: b - 0.45, diveEnd: b, diveTo: [960, 570] });
      pose(k, { x: 960, y: 150, o: fadeIn(t, a + 0.1) });
      pose(head.el, { x: 960, y: 270 });
      head.render(t, a + 0.1, 0.035);
      rows.forEach(({ p, at, el }, i) => {
        const grow = ease.outCubic(prog(t, at, 0.7));
        const frac = ((p.homeProb * 100 - lo) / (hi - lo)) * grow;
        el.textContent = `${(names[p.source] ?? p.source).padEnd(11)} ${bar(frac, 30)} ${pct(p.homeProb * grow)}`;
        pose(el, { x: 960, y: 480 + i * 92, o: fadeIn(t, at, 0.2) });
      });
      pose(axis, { x: 960, y: 760, o: fadeIn(t, a + BEAT * 6) });
      const qIn = fadeIn(t, a + BEAT * 8.5, 0.5);
      pose(q, { x: 960, y: lerp(930, 900, qIn), o: qIn });
    };
  });
}

export function sayIt(parent: HTMLElement, a: number, b: number): Scene {
  const d = data().hunch;
  return scene("say", parent, a, b, "dark", (st) => {
    const box = h("div", "c prompt", st.cam);
    const body = h("span", "", box);
    const caret = h("span", "caret", box);
    const send = h("div", "send", box, "↑");
    const steps = h("div", "c steps", st.cam);
    const lines = d.steps.map((s, i) => {
      const at = a + 4.9 + i * BEAT * 1.5;
      sfx(at, i === d.steps.length - 1 ? "ding" : "tick", i === d.steps.length - 1 ? 0.5 : 0.7);
      return { s, at, el: h("div", "", steps) };
    });
    const typeFrom = a + 0.7;
    const typeFor = 3.4;
    keySounds(typeFrom, d.text.length, typeFor, 0.5);
    sfx(a + 4.45, "blip", 0.7);
    return (t) => {
      camera(st, t, a, { push: 0.008, diveAt: b - 0.5, diveEnd: b, diveTo: [960, 780] });
      const p = prog(t, typeFrom, typeFor);
      if (p <= 0) {
        body.className = "ph";
        body.textContent = "What's your hunch?";
      } else {
        body.className = "";
        body.textContent = typed(d.text, p);
      }
      caret.style.opacity = p > 0 && p < 1 ? "1" : Math.floor(t * 2.2) % 2 ? "0" : "1";
      const hit = slam(t, a + 4.45, 1.35);
      send.style.transform = t >= a + 4.45 ? `scale(${(2 - hit).toFixed(3)})` : "";
      pose(box, { x: 960, y: 330 });
      lines.forEach(({ s, at, el }, i) => {
        const last = i === lines.length - 1;
        el.textContent = `${t >= at + BEAT * 1.5 || last ? "✓" : "·"} ${s}`;
        el.className = last ? "on" : "";
        el.style.opacity = String(fadeIn(t, at, 0.25));
        el.style.transform = `translateX(${((1 - fadeIn(t, at, 0.4)) * 40).toFixed(1)}px)`;
        if (last) el.style.fontWeight = "600";
      });
      pose(steps, { x: 960, y: 720 });
    };
  });
}

function wrap(parts: string[], max: number): string[] {
  const out: string[] = [];
  for (const part of parts) {
    const last = out.at(-1);
    if (last !== undefined && last.length + part.length + 3 <= max)
      out[out.length - 1] = `${last} · ${part}`;
    else out.push(part);
  }
  return out;
}

export function rule(parent: HTMLElement, a: number, b: number): Scene {
  const c = data().hunch.rule.card;
  const rows: Array<[string, string]> = [["RULE", c.title]];
  const block = (label: string, values: string[]) =>
    wrap(
      values.flatMap((v) => v.split(" · ")),
      44,
    ).forEach((v, i) => {
      rows.push([i === 0 ? label : "", v]);
    });
  block("WHEN", c.when);
  block("THEN", c.then);
  rows.push(["AGAINST", c.against]);
  rows.push(["LIMITS", c.limits]);
  return scene("rule", parent, a, b, "light", (st) => {
    const card = h("div", "c card", st.cam);
    card.style.fontSize = "38px";
    const els = rows.map(([label, value], i) => {
      const line = h("div", "", card);
      const lab = h("span", "lab", line);
      lab.textContent = label.padEnd(9);
      const val = h("span", "", line);
      const at = a + 0.25 + i * BEAT * 0.7;
      sfx(at, "tick", 0.6);
      return { val, value, at, line };
    });
    const note = text(
      st.cam,
      "mono g3",
      `compiled by the ${data().hunch.rule.compiledBy}, checked against the schema`,
      "font-size:26px",
    );
    const say = bigType(st.cam, "You read it. You approve it. Code runs it.", {
      size: 60,
      weight: 700,
      by: "words",
    });
    typeSounds(a + BEAT * 8.6, 9, 0.07, 1, 0.3);
    return (t) => {
      camera(st, t, a, { push: 0.01 });
      for (const { val, value, at, line } of els) {
        val.textContent = typed(value, prog(t, at, 0.35));
        line.style.opacity = t < at ? "0" : "1";
      }
      card.style.fontWeight = "400";
      pose(card, {
        x: 960,
        y: 440,
        o: fadeIn(t, a + 0.05, 0.3),
        s: lerp(0.96, 1, fadeIn(t, a, 0.6)),
      });
      pose(note, { x: 960, y: 800, o: fadeIn(t, a + BEAT * 6.5) });
      pose(say.el, { x: 960, y: 910 });
      say.render(t, a + BEAT * 8.6, 0.07);
    };
  });
}

export function replay(parent: HTMLElement, a: number, b: number): Scene {
  const r = data().hunch.replay;
  const days = r.days;
  const max = Math.max(4, ...days.map((d) => d.fires));
  const lh = Math.min(36, 330 / max);
  return scene("replay", parent, a, b, "dark", (st) => {
    const k = kicker(st.cam, `Replay · last 7 days · ${r.considered} games · practice, not record`);
    const cols = days.map((d, i) => {
      const el = h("div", "c col", st.cam);
      el.style.fontSize = `${lh}px`;
      const cells = Array.from({ length: d.fires }, (_, j) => {
        const right = j >= d.fires - d.right;
        const cell = h("div", right ? "" : "g3", el);
        cell.textContent = right ? "████" : "░░░░";
        return cell;
      });
      const top = text(st.cam, "mono", d.fires ? `${d.right}/${d.fires}` : "·", "font-size:26px");
      const day = text(st.cam, "mono g3", d.day.slice(5), "font-size:22px");
      const at = a + 0.4 + i * BEAT * 0.55;
      if (d.fires) sfx(at, "tick", 0.6);
      return {
        el,
        cells,
        top,
        day,
        at,
        x: 380 + i * (1160 / Math.max(1, days.length - 1)),
        n: d.fires,
      };
    });
    const legend = text(st.cam, "mono g3", "████ right   ░░░░ wrong", "font-size:24px");
    const big = bigType(st.cam, `${r.fires} fires · ${r.right} right`, { size: 118 });
    const ahead = r.brier !== null && r.against.brier !== null && r.brier < r.against.brier;
    const sub = h("div", "c sub", st.cam);
    sub.style.fontSize = "42px";
    sub.innerHTML =
      r.brier !== null && r.against.brier !== null
        ? `Brier ${r.brier.toFixed(3)} vs ${r.against.name === "polymarket" ? "Polymarket" : r.against.name} ${r.against.brier.toFixed(3)} on the same games${ahead ? ' — <span class="hit">ahead of the market, so far</span>' : ""}`
        : "No fires yet";
    sfx(a + BAR * 2.2, "impact", 0.6);
    typeSounds(a + BAR * 2.2, 18, 0.03, 4);
    return (t) => {
      camera(st, t, a, { push: 0.01, diveAt: b - 0.45, diveEnd: b, diveTo: [960, 830] });
      pose(k, { x: 960, y: 110, o: fadeIn(t, a) });
      const base = 600;
      for (const c of cols) {
        const shown = Math.floor(ease.outCubic(prog(t, c.at, 0.6)) * c.n + 0.0001);
        c.cells.forEach((cell, j) => {
          cell.style.visibility = c.n - j <= shown ? "" : "hidden";
        });
        pose(c.el, { x: c.x, y: base - (c.n * lh * 1.02) / 2, o: c.n ? 1 : 0 });
        pose(c.top, { x: c.x, y: base - c.n * lh * 1.02 - 28, o: fadeIn(t, c.at + 0.5) });
        pose(c.day, { x: c.x, y: base + 34, o: fadeIn(t, a + 0.2) });
      }
      pose(legend, { x: 960, y: 690, o: fadeIn(t, a + BAR) });
      pose(big.el, { x: 960, y: 830 });
      big.render(t, a + BAR * 2.2, 0.03);
      pose(sub, { x: 960, y: 950, o: fadeIn(t, a + BAR * 2.2 + BEAT * 2, 0.5) });
    };
  });
}

export function record(parent: HTMLElement, a: number, b: number): Scene {
  const p = data().proof;
  const check = (prefix: string) => p.checks.find((c) => c.name.startsWith(prefix))?.detail ?? "";
  const rows: Array<[string, string, string]> = [
    ["PICK", `${p.pick.label} · ${p.pick.team} · ${Math.round(p.pick.confidence * 100)}%`, ""],
    ["LOGGED", check("Logged before lock"), ""],
    ["SHA-256", `${p.hash.slice(0, 40)}…`, ""],
    ["SIGNED", `by Hunch's ${check("Signed by")}`, ""],
    ["DELEGATED", check("Under the owner"), ""],
    ["ANCHORED", `Sui ${p.anchor.network} · tx ${p.anchor.digest}`, "#4da2ff"],
    ["READ BACK", "through Tatum's gRPC · root matches", "#2f8a5b"],
  ];
  return scene("record", parent, a, b, "light", (st) => {
    const head = bigType(st.cam, "Then put it on record.", { size: 120 });
    typeSounds(a + 0.1, 19, 0.035, 4);
    const els = rows.map(([label, value, color], i) => {
      const line = h("div", "c row", st.cam);
      line.style.fontSize = "36px";
      const lab = h("span", "g3", line);
      lab.textContent = label.padEnd(11);
      const val = h("span", "", line);
      if (color) val.style.color = color;
      const at = a + BEAT * 2.6 + i * BEAT * 1.05;
      sfx(
        at,
        label === "ANCHORED" ? "ding" : label === "READ BACK" ? "coin" : "tick",
        label === "ANCHORED" ? 0.6 : 0.7,
      );
      return { line, val, value, at, i };
    });
    return (t) => {
      camera(st, t, a, { push: 0.008 });
      pose(head.el, { x: 960, y: 170 });
      head.render(t, a + 0.1, 0.035);
      for (const { line, val, value, at, i } of els) {
        val.textContent = t < at ? "" : scramble(value, prog(t, at, 0.5), i + 3);
        pose(line, { x: 230, y: 330 + i * 86, center: false, o: fadeIn(t, at, 0.2) });
      }
    };
  });
}

export function noHiding(parent: HTMLElement, a: number, b: number): Scene {
  const p = data().proof;
  const ok = p.checks.filter((c) => c.ok).length;
  return scene("nohide", parent, a, b, "dark", (st) => {
    const late = bigType(st.cam, "No pick after lock.", { size: 120 });
    const req = text(st.cam, "row g3", "POST /api/picks · 2 min after tip-off", "font-size:40px");
    const stamp = text(st.cam, "stamp", "409 · LOCKED");
    const erased = bigType(st.cam, "No loss erased.", { size: 120 });
    const card = h("div", "c card", st.cam);
    card.style.fontSize = "40px";
    card.innerHTML = "";
    for (const [lab, val, cls] of [
      [
        "PICK    ",
        `${p.pick.label} · ${p.pick.team} · ${Math.round(p.pick.confidence * 100)}%`,
        "",
      ],
      ["RESULT  ", p.pick.outcome, p.pick.outcome === "wrong" ? "miss" : "hit"],
      ["PROOF   ", `${ok} of ${p.checks.length} checks pass`, "hit"],
    ] as const) {
      const line = h("div", "", card);
      h("span", "lab", line).textContent = lab;
      h("span", cls, line).textContent = val;
    }
    const sub = text(
      st.cam,
      "sub",
      "A wrong pick stays on the record, signed and anchored.",
      "font-size:46px",
    );
    typeSounds(a + 0.1, 16, 0.035, 4);
    keySounds(a + BEAT * 1.6, 36, 0.8, 0.4);
    sfx(a + BEAT * 3, "impact", 0.85);
    typeSounds(a + BEAT * 6.2, 14, 0.035, 4);
    sfx(a + BEAT * 8, "thud", 0.6);
    return (t) => {
      camera(st, t, a, { push: 0.01 });
      const first = fadeOut(t, a + BEAT * 5.6, 0.35);
      pose(late.el, { x: 960, y: 250, o: first });
      late.render(t, a + 0.1, 0.035);
      req.textContent = typed(
        "POST /api/picks · 2 min after tip-off",
        prog(t, a + BEAT * 1.6, 0.8),
      );
      pose(req, { x: 960, y: 450, o: first * fadeIn(t, a + BEAT * 1.6, 0.2) });
      const [sx, sy] = shake(t, a + BEAT * 3, 22);
      pose(stamp, {
        x: 960 + sx,
        y: 680 + sy,
        r: -6,
        s: slam(t, a + BEAT * 3, 2.8),
        o: (t >= a + BEAT * 3 ? 1 : 0) * first,
      });
      pose(erased.el, { x: 960, y: 230 });
      erased.render(t, a + BEAT * 6.2, 0.035);
      pose(card, {
        x: 960,
        y: 530,
        o: fadeIn(t, a + BEAT * 8, 0.3),
        s: lerp(0.94, 1, fadeIn(t, a + BEAT * 8, 0.5)),
      });
      pose(sub, { x: 960, y: 820, o: fadeIn(t, a + BEAT * 9.5, 0.5) });
    };
  });
}
