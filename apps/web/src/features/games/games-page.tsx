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

const SOURCES: GamePrice["source"][] = ["books", "polymarket", "kalshi"];
const TIP = new Intl.DateTimeFormat("en-GB", {
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
  if (game.status === "in") return `live ${game.awayScore ?? 0}–${game.homeScore ?? 0}`;
  return `final ${game.awayScore ?? 0}–${game.homeScore ?? 0}`;
}

export function GamesPage() {
  const { games, problem, picked, pickProblem, pick } = useGames();
  const [open, setOpen] = useState<string | null>(null);
  const flagged = games?.filter((g) => g.flagged).length ?? 0;
  return (
    <main className="mx-auto w-full max-w-[752px] px-4 pt-[10vh] pb-20">
      <h1 className="text-[15px] font-semibold">Tonight's NBA, every source side by side</h1>
      <p className="mt-1 text-[13px] text-ink-3">
        The home team's chance to win: the books (DraftKings via ESPN, vig removed), Polymarket and
        Kalshi. Snapshots every 5 minutes within 2 hours of tip-off, every 30 before that. A split
        of 5+ points is flagged.
      </p>
      {problem && <p className="mt-4 text-ink-2">{problem}</p>}
      {!games && !problem && <Skeleton className="mt-6 h-40 w-full" />}
      {games && games.length === 0 && (
        <p className="mt-6 text-ink-2">
          No NBA games in the next 30 hours. The ingest checks every 5 minutes.
        </p>
      )}
      {games && games.length > 0 && (
        <>
          <p className="mt-5 font-mono text-xs text-ink-2">
            {games.length} games ·{" "}
            {flagged === 0
              ? "no splits ≥ 5 pts right now"
              : `◆ ${flagged} split${flagged > 1 ? "s" : ""} ≥ 5 pts`}
          </p>
          <Table className="mt-2 text-[13px]">
            <TableHeader>
              <TableRow>
                <TableHead>Game</TableHead>
                <TableHead>Tip-off</TableHead>
                <TableHead>Books</TableHead>
                <TableHead>Polymarket</TableHead>
                <TableHead>Kalshi</TableHead>
                <TableHead>Gap</TableHead>
                <TableHead>Call</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {games.map((g) => (
                <Fragment key={g.id}>
                  <TableRow
                    className="cursor-pointer"
                    onClick={() => setOpen((o) => (o === g.id ? null : g.id))}
                    aria-expanded={open === g.id}
                  >
                    <TableCell className="font-medium">
                      {open === g.id ? "▾ " : "▸ "}
                      {g.away} @ {g.home}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-ink-2">{state(g)}</TableCell>
                    {SOURCES.map((s) => (
                      <TableCell key={s}>
                        <PriceCell game={g} source={s} />
                      </TableCell>
                    ))}
                    <TableCell
                      className={cn(
                        "font-mono text-xs",
                        g.flagged ? "text-foreground" : "text-ink-3",
                      )}
                    >
                      {g.gap ? `${g.flagged ? "◆ " : ""}${g.gap.pts.toFixed(1)}` : "·"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {g.call ? (g.call.homeProb * 100).toFixed(1) : "·"}
                    </TableCell>
                  </TableRow>
                  {open === g.id && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={7} className="whitespace-normal">
                        <ResearchCard
                          game={g}
                          pickedId={picked[g.id]}
                          problem={pickProblem}
                          onPick={(side, confidence) => void pick(g.id, side, confidence)}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
          <p className="mt-3 text-[12.5px] text-ink-3">
            Grey prices are older than the freshness window and never count for a rule. "Call" is
            the agent's trust-weighted chance for the home team; open a game to see the memory it
            leans on.
          </p>
        </>
      )}
    </main>
  );
}
