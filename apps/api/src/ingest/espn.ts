import { z } from "zod";
import { getJson } from "./http.ts";
import { homeProbWithoutVig, parseAmerican } from "./odds.ts";
import { standardAbbr } from "./teams.ts";

const BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba";

const line = z.object({ odds: z.string().optional() }).optional();
const side = z.object({ close: line, open: line }).optional();
const moneyline = z.object({ home: side, away: side }).optional();

const competitor = z.object({
  homeAway: z.enum(["home", "away"]),
  team: z.object({ abbreviation: z.string(), name: z.string(), displayName: z.string() }),
  score: z.string().optional(),
  winner: z.boolean().optional(),
});

const scoreboardSchema = z.object({
  events: z.array(
    z.object({
      id: z.string(),
      date: z.string(),
      status: z.object({ type: z.object({ state: z.enum(["pre", "in", "post"]) }) }),
      competitions: z
        .array(
          z.object({
            competitors: z.array(competitor),
            odds: z.array(z.object({ moneyline })).optional(),
          }),
        )
        .min(1),
    }),
  ),
});

const summarySchema = z.object({
  pickcenter: z.array(z.object({ moneyline })).optional(),
});

export interface Team {
  abbr: string;
  name: string;
  displayName: string;
  score: number | null;
  winner: boolean;
}

export interface EspnGame {
  espnId: string;
  startsAt: Date;
  state: "pre" | "in" | "post";
  home: Team;
  away: Team;
  booksHomeProb: number | undefined;
}

function team(c: z.infer<typeof competitor>): Team {
  const score = c.score === undefined ? null : Number(c.score);
  return {
    abbr: standardAbbr(c.team.abbreviation),
    name: c.team.name,
    displayName: c.team.displayName,
    score: Number.isFinite(score) ? score : null,
    winner: c.winner === true,
  };
}

function booksProb(ml: z.infer<typeof moneyline>): number | undefined {
  const home = parseAmerican(ml?.home?.close?.odds);
  const away = parseAmerican(ml?.away?.close?.odds);
  if (home === undefined || away === undefined) return undefined;
  return homeProbWithoutVig(home, away);
}

export async function fetchScoreboard(easternDay: string): Promise<EspnGame[]> {
  const data = await getJson(
    `${BASE}/scoreboard?dates=${easternDay.replaceAll("-", "")}`,
    scoreboardSchema,
  );
  const games: EspnGame[] = [];
  for (const event of data.events) {
    const competition = event.competitions[0];
    const home = competition?.competitors.find((c) => c.homeAway === "home");
    const away = competition?.competitors.find((c) => c.homeAway === "away");
    if (!competition || !home || !away) continue;
    games.push({
      espnId: event.id,
      startsAt: new Date(event.date),
      state: event.status.type.state,
      home: team(home),
      away: team(away),
      booksHomeProb: booksProb(competition.odds?.[0]?.moneyline),
    });
  }
  return games;
}

export async function fetchClosingBooksProb(espnId: string): Promise<number | undefined> {
  const data = await getJson(`${BASE}/summary?event=${espnId}`, summarySchema);
  return booksProb(data.pickcenter?.[0]?.moneyline);
}
