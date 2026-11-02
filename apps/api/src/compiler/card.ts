import { type Condition, isBtcRule, type MarketSource, type Rule } from "./rule.ts";

export interface RuleCard {
  title: string;
  version: number;
  stage: string;
  when: string[];
  then: string[];
  against: string;
  limits: string;
}

const NAME: Record<MarketSource, string> = {
  books: "the books",
  polymarket: "Polymarket",
  kalshi: "Kalshi",
};

const POSSESSIVE: Record<MarketSource, string> = {
  books: "the books'",
  polymarket: "Polymarket's",
  kalshi: "Kalshi's",
};

const SHORT_MONTH = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function pct(p: number): string {
  return `${Math.round(p * 100)}%`;
}

function describe(c: Condition): string {
  switch (c.kind) {
    case "before_lock":
      return `${c.minutes} min before tip-off`;
    case "gap":
      return `${NAME[c.a]} vs ${NAME[c.b]} ≥ ${c.min_pts} pts apart`;
    case "price":
      return `${POSSESSIVE[c.source]} ${c.side} ${c.op === "gte" ? "≥" : "≤"} ${pct(c.value)}`;
    case "move":
      if (c.min_pct === 0) return "BTC moved in the last 5 min";
      return `BTC ${c.min_pct > 0 ? "up" : "down"} ≥ ${Math.abs(c.min_pct)}% in the last 5 min`;
    default: {
      const never: never = c;
      return never;
    }
  }
}

export function ruleCard(r: Rule): RuleCard {
  const limits = `≤ ${r.limits.picks_per_day} picks a day · until ${SHORT_MONTH.format(new Date(`${r.limits.until}T00:00:00Z`))}`;
  const stage = r.stage === "on_record" ? "on record" : "practice";
  if (isBtcRule(r)) {
    const pick = r.then[0];
    const side =
      pick.side.direction === "same_as_move"
        ? "the same way it just moved"
        : pick.side.direction === "up"
          ? "UP: the next 5 min end higher"
          : "DOWN: the next 5 min end lower";
    return {
      title: r.name,
      version: r.version,
      stage,
      when: [`BTC/USD · ${r.when.all.map(describe).join(" · ")}`],
      then: [`PICK ${side}`, `confidence ${pct(pick.confidence.fixed)}`],
      against: "DeepBook Predict's price (a coin flip until Predict prices are stored)",
      limits,
    };
  }
  const pick = r.then[0];
  const side =
    "favourite_of" in pick.side
      ? `${POSSESSIVE[pick.side.favourite_of]} favourite`
      : "underdog_of" in pick.side
        ? `${POSSESSIVE[pick.side.underdog_of]} underdog`
        : `the ${pick.side.team} team`;
  const confidence =
    "price_of" in pick.confidence
      ? `confidence = ${POSSESSIVE[pick.confidence.price_of]} price${pick.confidence.price_of === "books" ? " (vig removed)" : ""}`
      : `confidence ${pct(pick.confidence.fixed)}`;
  return {
    title: r.name,
    version: r.version,
    stage,
    when: [`NBA game · ${r.when.all.map(describe).join(" · ")}`],
    then: [`PICK ${side}`, confidence],
    against: `${POSSESSIVE[r.against]} price`,
    limits,
  };
}
