import type { BtcRule, MarketSource, SportsRule } from "./rule.ts";

export type CompileResult =
  | { kind: "rule"; rule: SportsRule | BtcRule; by: "pattern" | "model" }
  | { kind: "question"; question: string }
  | { kind: "refused"; reason: string };

const SOURCE_PATTERNS: [MarketSource, RegExp][] = [
  ["books", /\b(?:the\s+)?(?:books|sportsbooks?|bookmakers?|bookies|draftkings|dk)\b/g],
  ["polymarket", /\b(?:polymarket|poly)\b/g],
  ["kalshi", /\bkalshi\b/g],
];

const SOURCE_NAME: Record<MarketSource, string> = {
  books: "The books",
  polymarket: "Polymarket",
  kalshi: "Kalshi",
};

const DEFAULT_LIMITS_DAYS = 28;
const DEFAULT_BEFORE_LOCK_MIN = 30;
const DEFAULT_BTC_CONFIDENCE = 0.6;

function sourcesInOrder(text: string): MarketSource[] {
  const found: { source: MarketSource; index: number }[] = [];
  for (const [source, rx] of SOURCE_PATTERNS) {
    for (const m of text.matchAll(rx)) found.push({ source, index: m.index });
  }
  found.sort((a, b) => a.index - b.index);
  return [...new Set(found.map((f) => f.source))];
}

function sourceAt(fragment: string): MarketSource | undefined {
  return sourcesInOrder(fragment)[0];
}

function trustedSource(text: string, sources: MarketSource[]): MarketSource | undefined {
  const sharper = text.match(
    /([a-z ]+?)\s+(?:is|are)\s+(?:sharper|smarter|better|more accurate)\s+than/,
  );
  if (sharper?.[1]) return sourceAt(sharper[1].split(/[,.;]/).pop() ?? "");
  const beats = text.match(/([a-z ]+?)\s+(?:beat|beats|wins? over)\s+/);
  if (beats?.[1]) return sourceAt(beats[1].split(/[,.;]/).pop() ?? "");
  const right = text.match(/([a-z ]+?)\s+(?:is|are)\s+(?:right|correct)\b/);
  if (right?.[1]) return sourceAt(right[1].split(/[,.;]/).pop() ?? "");
  const trust = text.match(/trust\s+([a-z ]+)/);
  if (trust?.[1]) return sourceAt(trust[1]);
  return sources.length === 1 ? sources[0] : undefined;
}

function untilDate(today: Date): string {
  return new Date(today.getTime() + DEFAULT_LIMITS_DAYS * 86_400_000).toISOString().slice(0, 10);
}

function compileSplit(text: string, today: Date): CompileResult | undefined {
  const sources = sourcesInOrder(text);
  if (sources.length < 2) return undefined;
  const points = text.match(/(\d+(?:\.\d+)?)\s*\+?\s*(?:points?|pts|percentage points|%)/);
  if (!points?.[1]) return undefined;
  if (!/\bnba\b|basketball/.test(text)) {
    if (/senate|house|election|midterm|epl|premier league|nfl|soccer/.test(text)) {
      return {
        kind: "refused",
        reason:
          "For now Hunch tests NBA moneylines and BTC. Elections and the EPL are next. Try the same hunch on NBA games.",
      };
    }
    return { kind: "question", question: "Which league should this run on? For now: NBA or BTC." };
  }
  const trusted = trustedSource(text, sources);
  const [first, second] = sources as [MarketSource, MarketSource];
  if (!trusted) {
    return {
      kind: "question",
      question: `When ${SOURCE_NAME[first]} and ${SOURCE_NAME[second]} split, which one do you think is right?`,
    };
  }
  const other = trusted === first ? second : first;
  const before = text.match(/(\d+)\s*(?:min(?:ute)?s?)\s+before/);
  const minutes = before?.[1] ? Number(before[1]) : DEFAULT_BEFORE_LOCK_MIN;
  const verb = trusted === "books" ? "beat" : "beats";
  const otherName = other === "books" ? "the books" : SOURCE_NAME[other];
  const name = `${SOURCE_NAME[trusted]} ${verb} ${otherName} on NBA splits`;
  return {
    kind: "rule",
    by: "pattern",
    rule: {
      name,
      version: 1,
      scope: { league: ["NBA"], market: "moneyline" },
      when: {
        all: [
          { kind: "before_lock", minutes },
          { kind: "gap", a: trusted, b: other, min_pts: Number(points[1]) },
        ],
      },
      then: [{ kind: "pick", side: { favourite_of: trusted }, confidence: { price_of: trusted } }],
      against: other,
      limits: { picks_per_day: 10, until: untilDate(today) },
      stage: "practice",
    },
  };
}

function compileBtc(text: string, today: Date): CompileResult | undefined {
  if (!/\b(?:btc|bitcoin)\b/.test(text)) return undefined;
  const up = /\b(?:rises?|rising|up|gains?|jumps?|climbs?|pumps?)\b/;
  const down = /\b(?:falls?|falling|down|drops?|dumps?|sinks?)\b/;
  const pct = text.match(/(\d+(?:\.\d+)?)\s*%/);
  const window = text.match(/in\s+(\d+)\s*(?:min(?:ute)?s?)/);
  const cause = text.split(/,|\bthen\b|→|->/)[0] ?? text;
  const direction = up.test(cause) ? 1 : down.test(cause) ? -1 : 0;
  if (direction === 0 || !pct?.[1]) {
    return {
      kind: "question",
      question:
        "How big a BTC move starts it, and up or down? For example: rises more than 0.3% in 5 minutes.",
    };
  }
  if (window?.[1] && Number(window[1]) !== 5) {
    return {
      kind: "refused",
      reason: "For now Hunch tests BTC over 5-minute windows. Try the same hunch over 5 minutes.",
    };
  }
  const reverses = /\b(?:reverses?|bounces?|reverts?|falls? back|gives? (?:it )?back)\b/.test(text);
  const confident = text.match(/(\d{2})\s*%\s*(?:sure|confident|of the time)/);
  const confidence = confident?.[1] ? Number(confident[1]) / 100 : DEFAULT_BTC_CONFIDENCE;
  const moveUp = direction > 0;
  const pickUp = reverses ? !moveUp : moveUp;
  return {
    kind: "rule",
    by: "pattern",
    rule: {
      name: `BTC ${moveUp ? "up" : "down"} ${pct[1]}% in 5 min ${reverses ? "reverses" : "keeps going"}`,
      version: 1,
      scope: { league: ["BTC"], market: "updown_5m" },
      when: {
        all: [{ kind: "move", source: "btc", window_min: 5, min_pct: direction * Number(pct[1]) }],
      },
      then: [
        {
          kind: "pick",
          side: { direction: pickUp ? "up" : "down" },
          confidence: { fixed: confidence },
        },
      ],
      against: "predict",
      limits: { picks_per_day: 20, until: untilDate(today) },
      stage: "practice",
    },
  };
}

export function compileByPattern(hunch: string, today: Date): CompileResult | undefined {
  const text = hunch.toLowerCase().replace(/\s+/g, " ").trim();
  return compileBtc(text, today) ?? compileSplit(text, today);
}

export function practiceMomentumRule(today: Date): BtcRule {
  return {
    name: "BTC keeps its 5-minute direction",
    version: 1,
    scope: { league: ["BTC"], market: "updown_5m" },
    when: { all: [{ kind: "move", source: "btc", window_min: 5, min_pct: 0 }] },
    then: [{ kind: "pick", side: { direction: "same_as_move" }, confidence: { fixed: 0.5 } }],
    against: "predict",
    limits: { picks_per_day: 50, until: untilDate(today) },
    stage: "practice",
  };
}
