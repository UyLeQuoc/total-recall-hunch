import { cube } from "./ascii.ts";
import {
  type Act,
  act,
  camera,
  data,
  decode,
  el,
  fin,
  fout,
  HIT,
  place,
  SUI,
  spinner,
  wrap,
} from "./kit.ts";
import { BEAT, clamp, ease, h, lerp, prog, rng, sfx, typed } from "./lib.ts";

export function sayIt(parent: HTMLElement, a: number, b: number): Act {
  const d = data().hunch;
  const c = d.rule.card;
  const rows: Array<[string, string]> = [["RULE", c.title]];
  const block = (label: string, values: string[]) => {
    wrap(
      values.flatMap((v) => v.split(" · ")),
      40,
    ).forEach((v, i) => {
      rows.push([i === 0 ? label : "", v]);
    });
  };
  block("WHEN", c.when);
  block("THEN", c.then);
  rows.push(["AGAINST", c.against]);
  rows.push(["LIMITS", c.limits]);
  return act("say it", parent, a, b, "paper", (st) => {
    const nav = el(st.cam, "mono nav");
    for (const [i, n] of ["hunch", "tonight", "learning", "status"].entries())
      h("span", i === 0 ? "on" : "", nav).textContent = n;
    const prompt = el(st.cam, "prompt");
    const body = h("span", "", prompt);
    const cur = h("span", "cur", prompt);
    const send = el(st.cam, "send", "↑");
    const status = el(st.cam, "steps-head");
    const steps = d.steps.map((s, i) => {
      const at = 2.6 + i * BEAT;
      sfx(
        a + at,
        i === d.steps.length - 1 ? "ding" : "tick",
        i === d.steps.length - 1 ? 0.5 : 0.35,
      );
      return { s, at, e: el(st.cam, "step") };
    });
    const card = el(st.cam, "card mono");
    const lines = rows.map(([lab, val], i) => {
      const row = h("div", "", card);
      h("span", "lab", row).textContent = lab.padEnd(8);
      const v = h("span", "", row);
      const at = 4.6 + i * 0.22;
      sfx(a + at, "tick", 0.25);
      return { row, v, val, at, i };
    });
    const foot = el(
      st.cam,
      "mono label",
      "compiled by the model · checked against the schema · you approve it, code runs it",
    );
    for (let k = 0; k < 40; k++) sfx(a + 0.3 + k * 0.05, "type", 0.3);
    sfx(a + 2.4, "blip", 0.6);
    return (_t, u) => {
      place(nav, 260, 70, 1, { center: false });
      const p = prog(u, 0.3, 2);
      body.className = p <= 0 ? "ph" : "";
      body.textContent = p <= 0 ? "What's your hunch?" : typed(d.text, p);
      cur.className = (p > 0 && p < 1) || Math.floor(u * 2.4) % 2 === 0 ? "cur" : "cur off";
      place(prompt, 260, 150, 1, { center: false });
      place(send, 1660, 180, 1, { s: u >= 2.4 ? 1 + 0.25 * Math.exp(-(u - 2.4) * 8) : 1 });
      const done = u >= 4.5;
      status.innerHTML = "";
      h("span", "", status).textContent = done ? "Tested" : u >= 2.5 ? `${spinner(u)} Testing` : "";
      h("span", "muted", status).textContent = done ? "  2.0s" : "";
      place(status, 260, 340, fin(u, 2.5, 0.2), { center: false });
      steps.forEach(({ s, at, e }, i) => {
        const last = i === steps.length - 1;
        e.textContent = `${u >= at + BEAT || last ? "✓" : spinner(u)} ${s}`;
        e.classList.toggle("strong", last);
        place(e, 260, 400 + i * 52, fin(u, at, 0.25), { center: false });
      });
      for (const { v, val, at, row } of lines) {
        v.textContent = decode(val, prog(u, at, 0.45), at * 10);
        row.style.opacity = u < at ? "0" : "1";
      }
      place(card, 1060, 340, fin(u, 4.5, 0.25), { center: false });
      place(foot, 960, 960, fin(u, 6.2, 0.4));
      camera(st, { s: 1 + u * 0.006, x: -u * 4 });
    };
  });
}

export function replay(parent: HTMLElement, a: number, b: number): Act {
  const r = data().hunch.replay;
  const days = r.days;
  const order: Array<{ c: number; k: number }> = [];
  days.forEach((d, c) => {
    for (let k = 0; k < d.fires; k++) order.push({ c, k });
  });
  const CW = 96;
  const LH = 34;
  return act("replay", parent, a, b, "ink", (st) => {
    const kick = el(
      st.cam,
      "mono label",
      `replay · 7 days · ${r.considered} games · practice, not record`,
    );
    const cells = order.map(({ c, k }, n) => {
      const d = days[c];
      const right = d !== undefined && k < d.right;
      const e = el(st.cam, `mono cell ${right ? "" : "wrong"}`, right ? "███" : "░░░");
      const at = 0.3 + n * 0.07;
      if (n % 2 === 0) sfx(a + at + 0.2, "tick", 0.25);
      return { e, c, k, at };
    });
    const labels = days.map((d, c) => ({ c, e: el(st.cam, "mono small", d.day.slice(5)) }));
    const tops = days.map((d, c) => ({
      c,
      d,
      e: el(st.cam, "mono small", d.fires ? `${d.right}/${d.fires}` : "·"),
    }));
    const stats = [
      ["fires", r.fires, 0],
      ["right", r.right, 0],
      ["brier", r.brier ?? 0, 3],
      [r.against.name, r.against.brier ?? 0, 3],
    ] as const;
    const counters = stats.map(([label, value, dp], i) => ({
      label: el(st.cam, "mono label left", label),
      num: el(st.cam, "number md"),
      value,
      dp,
      i,
    }));
    const ahead = r.brier !== null && r.against.brier !== null && r.brier < r.against.brier;
    const verdict = el(
      st.cam,
      "mono verdict",
      ahead
        ? "ahead of the market it bets against — so far"
        : "behind the market it bets against — so far",
    );
    for (let k = 0; k < 10; k++) sfx(a + 2.6 + k * 0.1, "tick", 0.2);
    sfx(a + 5.5, "ding", 0.45);
    return (_t, u) => {
      place(kick, 960, 110, fin(u, 0, 0.3));
      const base = 800;
      for (const { e, c, k, at } of cells) {
        const fall = ease.outBack(clamp(prog(u, at, 0.3)), 1.4);
        const yTo = base - k * LH;
        place(e, 200 + c * CW, lerp(-60, yTo, fall), u < at ? 0 : 1);
      }
      for (const { c, e } of labels) place(e, 200 + c * CW, base + 44, fin(u, 0.2));
      for (const { c, d, e } of tops)
        place(
          e,
          200 + c * CW,
          base - d.fires * LH - 30,
          fin(u, 0.3 + (d.fires ? 0.5 : 0) + c * 0.15),
        );
      for (const { label, num, value, dp, i } of counters) {
        const at = 2.6 + i * BEAT;
        const k = ease.outCubic(prog(u, at, 0.9));
        num.textContent = (value * k).toFixed(dp);
        num.classList.toggle("hit", i === 2 && ahead && k >= 1);
        place(label, 1180, 300 + i * 150, fin(u, at, 0.3), { center: false });
        place(num, 1180, 330 + i * 150, fin(u, at, 0.3), { center: false });
      }
      place(verdict, 960, 960, fin(u, 5.5, 0.4));
      camera(st, { s: 1 + u * 0.008 });
    };
  });
}

export function record(parent: HTMLElement, a: number, b: number): Act {
  const p = data().proof;
  const check = (prefix: string) => p.checks.find((c) => c.name.startsWith(prefix))?.detail ?? "";
  const hex = p.hash.match(/.{1,16}/g) ?? [p.hash];
  return act("on record", parent, a, b, "paper", (st) => {
    const field = st.ascii(10, 18);
    const head = el(st.cam, "headline", "");
    const nodes = [
      {
        x: 260,
        at: 0.8,
        title: "pick",
        body: [
          `${p.pick.label}`,
          `${p.pick.team} · ${Math.round(p.pick.confidence * 100)}%`,
          check("Logged before"),
        ],
      },
      { x: 680, at: 1.8, title: "sha-256", body: hex },
      {
        x: 1100,
        at: 2.8,
        title: "signed · batched",
        body: [check("Signed by"), check("In a batch").split(" · ")[0] ?? "", "merkle root →"],
      },
    ].map((n, i) => {
      sfx(a + n.at, "blip", 0.45);
      const box = el(st.cam, "node mono");
      const t = h("div", "nt", box);
      t.textContent = n.title;
      const lines = n.body.map(() => h("div", "", box));
      return { ...n, box, lines, i };
    });
    const arrows = [0, 1, 2].map((i) => ({ e: el(st.cam, "mono arrow"), at: 1.3 + i, i }));
    const sui = el(st.cam, "mono suilabel", "sui testnet");
    const tatum = el(st.cam, "mono tatum", "via tatum grpc");
    const tx = el(st.cam, "mono txline");
    const back = el(st.cam, "mono backline");
    sfx(a + 3.8, "whoosh", 0.4);
    sfx(a + 5.2, "coin", 0.55);
    sfx(a + 6.2, "ding", 0.5);
    return (_t, u) => {
      head.textContent = decode("Put it on record.", prog(u, 0.05, 0.6), 2);
      place(head, 960, 150, fin(u, 0.05, 0.2));
      for (const n of nodes) {
        n.lines.forEach((l, k) => {
          l.textContent = decode(n.body[k] ?? "", prog(u, n.at + 0.1 + k * 0.08, 0.5), n.x + k);
        });
        place(n.box, n.x, 520, fin(u, n.at, 0.25), { s: lerp(0.94, 1, fin(u, n.at, 0.4)) });
      }
      for (const { e, at, i } of arrows) {
        const k = prog(u, at, 0.45);
        const len = 7;
        const pos = Math.floor(((u * 6) % 1) * len);
        e.textContent =
          Array.from({ length: len }, (_, j) =>
            j < Math.round(k * len) ? (k >= 1 && j === pos ? "●" : "─") : " ",
          ).join("") + (k >= 1 ? "▶" : "");
        place(e, 470 + i * 420, 520, k > 0 ? 1 : 0);
      }
      field.clear();
      const cubeIn = fin(u, 3.8, 0.6);
      if (cubeIn > 0) {
        const size = 170 * cubeIn;
        field.paint((x, y) => {
          if (Math.abs(x - 1640) > 210 || Math.abs(y - 510) > 210) return 0;
          return cube(x, y, 1640, 510, size, 0.62 + 0.18 * Math.sin(u * 0.9), 0.75 + u * 0.75);
        }, SUI);
      }
      place(sui, 1640, 720, fin(u, 4, 0.3));
      place(tatum, 1310, 470, fin(u, 4, 0.3));
      tx.textContent = decode(`anchored · tx ${p.anchor.digest}`, prog(u, 5.2, 0.7), 31);
      place(tx, 960, 830, fin(u, 5.2, 0.2));
      back.textContent = decode(
        "read back from sui through tatum's grpc · root matches ✓",
        prog(u, 6.2, 0.6),
        32,
      );
      place(back, 960, 890, fin(u, 6.2, 0.2));
      camera(st, { s: 1 + u * 0.006 });
    };
  });
}

export function noHiding(parent: HTMLElement, a: number, b: number): Act {
  const p = data().proof;
  return act("no hiding", parent, a, b, "ink", (st) => {
    const late = el(st.cam, "headline", "");
    const req = el(st.cam, "mono request");
    const stamp = el(st.cam, "stamp mono", "409 · locked");
    const lost = el(st.cam, "headline", "");
    const pick = el(st.cam, "mono pickline");
    const checks = p.checks.map((c, i) => ({ c, i, e: el(st.cam, "mono check") }));
    const tag = el(st.cam, "headline", "");
    for (let k = 0; k < 18; k++) sfx(a + 0.8 + k * 0.045, "type", 0.3);
    sfx(a + 1.6, "glitch", 0.9);
    sfx(a + 1.62, "thud", 0.8);
    checks.forEach(({ i }) => {
      sfx(a + 4.6 + i * 0.25, "tick", 0.4);
    });
    sfx(a + 6.6, "swish", 0.4);
    return (_t, u) => {
      const first = fout(u, 3.4, 0.35);
      late.textContent = decode("Too late?", prog(u, 0.05, 0.4), 3);
      place(late, 960, 250, fin(u, 0.05, 0.2) * first);
      req.textContent = typed("POST /api/picks · 2 min after tip-off", prog(u, 0.8, 0.8));
      place(req, 960, 420, fin(u, 0.8, 0.1) * first);
      const g = u >= 1.6 && u < 2.2;
      const r = rng(Math.floor(u * 60));
      const jx = g ? (r() - 0.5) * 60 : 0;
      stamp.style.textShadow = g
        ? `${(r() * 14).toFixed(0)}px 0 ${SUI}, ${(-r() * 14).toFixed(0)}px 0 ${HIT.ink}`
        : "";
      stamp.style.clipPath =
        g && r() > 0.5 ? `inset(${(r() * 40).toFixed(0)}% 0 ${(r() * 40).toFixed(0)}% 0)` : "";
      place(stamp, 960 + jx, 640, (u >= 1.6 ? 1 : 0) * first, {
        r: -4,
        s: u >= 1.6 ? 1 + 0.4 * Math.exp(-(u - 1.6) * 12) : 1,
      });
      lost.textContent = decode("Lost?", prog(u, 3.6, 0.4), 4);
      place(lost, 960, 190, fin(u, 3.6, 0.2));
      pick.innerHTML = "";
      h("span", "muted", pick).textContent = "pick ";
      h("span", "", pick).textContent =
        `${p.pick.label} · ${p.pick.team} · ${Math.round(p.pick.confidence * 100)}%   `;
      h("span", "muted", pick).textContent = "result ";
      h("span", p.pick.outcome === "wrong" ? "miss" : "hit", pick).textContent = p.pick.outcome;
      place(pick, 960, 320, fin(u, 4, 0.3));
      for (const { c, i, e } of checks) {
        const at = 4.6 + i * 0.25;
        e.innerHTML = "";
        h("span", c.ok ? "hit" : "miss", e).textContent = u >= at ? (c.ok ? "✓ " : "✗ ") : "  ";
        h("span", "", e).textContent = c.name.toLowerCase();
        h("span", "muted", e).textContent = `  ${c.detail}`;
        place(e, 560, 410 + i * 54, fin(u, at, 0.2), { center: false });
      }
      tag.textContent = decode("No loss erased. No win invented.", prog(u, 6.6, 0.7), 5);
      place(tag, 960, 900, fin(u, 6.6, 0.2));
      camera(st, { s: 1 + u * 0.006 });
    };
  });
}
