const ESPN_TO_STANDARD: Record<string, string> = {
  GS: "GSW",
  NO: "NOP",
  NY: "NYK",
  SA: "SAS",
  UTAH: "UTA",
  WSH: "WAS",
};

export function standardAbbr(espnAbbr: string): string {
  return ESPN_TO_STANDARD[espnAbbr] ?? espnAbbr;
}

const EASTERN_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function easternDate(at: Date): string {
  return EASTERN_DATE.format(at);
}

const KALSHI_MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

export interface Matchup {
  away: string;
  home: string;
  startsAt: Date;
}

export function polymarketSlug(game: Matchup): string {
  return `nba-${game.away.toLowerCase()}-${game.home.toLowerCase()}-${easternDate(game.startsAt)}`;
}

export function kalshiEventTicker(game: Matchup): string {
  const [year = "", month = "", day = ""] = easternDate(game.startsAt).split("-");
  const mon = KALSHI_MONTHS[Number(month) - 1] ?? "";
  return `KXNBAGAME-${year.slice(2)}${mon}${day}${game.away}${game.home}`;
}
