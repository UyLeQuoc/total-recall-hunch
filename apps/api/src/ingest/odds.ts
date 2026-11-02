export function impliedFromAmerican(odds: number): number {
  if (odds === 0 || !Number.isFinite(odds)) return Number.NaN;
  return odds > 0 ? 100 / (odds + 100) : -odds / (-odds + 100);
}

export function parseAmerican(text: string | undefined): number | undefined {
  if (text === undefined) return undefined;
  const cleaned = text.trim().toUpperCase();
  if (cleaned === "EVEN" || cleaned === "EV") return 100;
  const value = Number(cleaned.replace("+", ""));
  return Number.isFinite(value) && value !== 0 ? value : undefined;
}

export function homeProbWithoutVig(homeOdds: number, awayOdds: number): number | undefined {
  const home = impliedFromAmerican(homeOdds);
  const away = impliedFromAmerican(awayOdds);
  const total = home + away;
  if (!Number.isFinite(total) || total <= 0) return undefined;
  return home / total;
}

export function normalisedPair(home: number, away: number): number | undefined {
  const total = home + away;
  if (!Number.isFinite(total) || total <= 0) return undefined;
  return home / total;
}
