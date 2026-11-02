import { Fragment, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { sparkline } from "@/lib/ascii/spark";
import { cn } from "@/lib/utils";
import { ResearchCard } from "./research-card";
import { type Game, type GamePrice, useGames } from "./use-games";

const TIP = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

function PriceCell({ game, source }: { game: Game; source: GamePrice["source"] }) {
  const p = game.prices.find((x) => x.source === source);
  if (!p) return <span className="text-ink-3">·</span>;
  return (
    <span className={cn("font-mono text-xs", !p.fresh && "text-ink-3")}>
      {(p.homeProb * 100).toFixed(1)} <span className="text-ink-3">{sparkline(p.series, 8)}</span>
    </span>
  );
}

function state(game: Game): string {
  if (game.status === "pre") return `${TIP.format(new Date(game.startsAt))} UTC`;
  if (game.league === "SENATE") return game.status === "post" ? "called" : "counting";
  if (game.status === "in") return `live ${game.awayScore ?? 0}–${game.homeScore ?? 0}`;
  return `final ${game.awayScore ?? 0}–${game.homeScore ?? 0}`;
}

interface GameTableProps {
  games: Game[];
  sources: GamePrice["source"][];
  homeLabel: string;
  lockLabel: string;
  open: string | null;
  onToggle: (id: string) => void;
  picked: Record<string, string>;
  pickProblem: string | null;
  onPick: (eventId: string, side: "home" | "away", confidence: number) => void;
}

function GameTable({
  games,
  sources,
  homeLabel,
  lockLabel,
  open,
  onToggle,
  picked,
  pickProblem,
  onPick,
}: GameTableProps) {
  return (
    <Table className="mt-2 text-[13px]">
      <TableHeader>
        <TableRow>
          <TableHead>{homeLabel}</TableHead>
          <TableHead>{lockLabel}</TableHead>
          {sources.map((s) => (
            <TableHead key={s} className="capitalize">
              {s}
            </TableHead>
          ))}
          <TableHead>Gap</TableHead>
          <TableHead>Call</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {games.map((g) => (
          <Fragment key={g.id}>
            <TableRow
              className="cursor-pointer"
              onClick={() => onToggle(g.id)}
              aria-expanded={open === g.id}
            >
              <TableCell className="font-medium">
                {open === g.id ? "▾ " : "▸ "}
                {g.title}
                {g.league === "SENATE" && (
                  <span className="font-normal text-ink-3">
                    {" "}
                    · {g.home} v {g.away}
                  </span>
                )}
              </TableCell>
              <TableCell className="font-mono text-xs text-ink-2">{state(g)}</TableCell>
              {sources.map((s) => (
                <TableCell key={s}>
                  <PriceCell game={g} source={s} />
                </TableCell>
              ))}
              <TableCell
                className={cn("font-mono text-xs", g.flagged ? "text-foreground" : "text-ink-3")}
              >
                {g.gap ? `${g.flagged ? "◆ " : ""}${g.gap.pts.toFixed(1)}` : "·"}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {g.call ? (g.call.homeProb * 100).toFixed(1) : "·"}
              </TableCell>
            </TableRow>
            {open === g.id && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={sources.length + 4} className="whitespace-normal">
                  <ResearchCard
                    game={g}
                    pickedId={picked[g.id]}
                    problem={pickProblem}
                    onPick={(side, confidence) => onPick(g.id, side, confidence)}
                  />
                </TableCell>
              </TableRow>
            )}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  );
}

export function GamesPage() {
  const { games, problem, picked, pickProblem, pick } = useGames();
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (id: string) => setOpen((o) => (o === id ? null : id));
  const nba = games?.filter((g) => g.league === "NBA") ?? [];
  const senate = games?.filter((g) => g.league === "SENATE") ?? [];
  const flagged = games?.filter((g) => g.flagged).length ?? 0;
  const onPick = (eventId: string, side: "home" | "away", confidence: number) =>
    void pick(eventId, side, confidence);
  return (
    <main className="mx-auto w-full max-w-[752px] px-4 pt-[10vh] pb-20">
      <h1 className="text-[15px] font-semibold">Tonight, every source side by side</h1>
      <p className="mt-1 text-[13px] text-ink-3">
        NBA: the home team's chance; the books are DraftKings via ESPN plus The Odds API's books
        when a key is set, vig removed and averaged. Senate: the Democrat's chance on Polymarket and
        Kalshi; every race locks when the first polls close. Snapshots every 5 minutes near lock,
        every 30 before. A split of 5+ points is flagged.
      </p>
      {problem && <p className="mt-4 text-ink-2">{problem}</p>}
      {!games && !problem && <Skeleton className="mt-6 h-40 w-full" />}
      {games && games.length === 0 && (
        <p className="mt-6 text-ink-2">
          Nothing locks in the next 36 hours. The ingest checks every 5 minutes.
        </p>
      )}
      {games && games.length > 0 && (
        <p className="mt-5 font-mono text-xs text-ink-2">
          {nba.length} games · {senate.length} Senate races ·{" "}
          {flagged === 0
            ? "no splits ≥ 5 pts right now"
            : `◆ ${flagged} split${flagged > 1 ? "s" : ""} ≥ 5 pts`}
        </p>
      )}
      {nba.length > 0 && (
        <GameTable
          games={nba}
          sources={["books", "polymarket", "kalshi"]}
          homeLabel="NBA"
          lockLabel="Tip-off"
          open={open}
          onToggle={toggle}
          picked={picked}
          pickProblem={pickProblem}
          onPick={onPick}
        />
      )}
      {senate.length > 0 && (
        <div className="mt-8">
          <GameTable
            games={senate}
            sources={["polymarket", "kalshi"]}
            homeLabel="Senate"
            lockLabel="Locks"
            open={open}
            onToggle={toggle}
            picked={picked}
            pickProblem={pickProblem}
            onPick={onPick}
          />
        </div>
      )}
      {games && games.length > 0 && (
        <p className="mt-3 text-[12.5px] text-ink-3">
          Grey prices are older than the freshness window and never count for a rule. "Call" is the
          agent's trust-weighted chance for the home team (NBA) or the Democrat (Senate); open a row
          to see the memory it leans on.
        </p>
      )}
    </main>
  );
}
