import { useState } from "react";
import { Link } from "wouter";
import { AsciiArt } from "@/components/ascii-art";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/hooks/use-account";
import { meter } from "@/lib/ascii/meter";
import type { Game } from "./use-games";

interface ResearchCardProps {
  game: Game;
  pickedId: string | undefined;
  problem: string | null;
  onPick: (side: "home" | "away", confidence: number) => void;
}

const NAME: Record<string, string> = {
  books: "the books",
  polymarket: "polymarket",
  kalshi: "kalshi",
};

export function ResearchCard({ game, pickedId, problem, onPick }: ResearchCardProps) {
  const { account } = useAccount();
  const call = game.call;
  const [side, setSide] = useState<"home" | "away">(call && call.homeProb < 0.5 ? "away" : "home");
  const callSide = call ? (side === "home" ? call.homeProb : 1 - call.homeProb) : 0.6;
  const [pct, setPct] = useState(Math.min(Math.max(Math.round(callSide * 100), 50), 99));
  const prices = meter(
    game.prices.map((p) => ({
      label: `${NAME[p.source] ?? p.source}${p.fresh ? "" : " (stale)"}`,
      value: p.homeProb,
    })),
    28,
    3,
  );
  return (
    <div className="flex flex-col gap-3 py-2">
      <div>
        <p className="mb-1 font-mono text-[11px] text-ink-3">{game.home} to win, every source</p>
        <AsciiArt text={prices} label={`${game.home}'s chance by source`} />
      </div>
      {call && (
        <div className="text-[13px] leading-relaxed">
          <p>
            <span className="font-medium">
              The agent's call: {game.home} {(call.homeProb * 100).toFixed(1)}%
            </span>
            <span className="text-ink-3">
              {" "}
              · plain average {(call.plainProb * 100).toFixed(1)}%
            </span>
          </p>
          {call.lines.map((l) => (
            <p key={l.text} className="text-ink-2">
              {l.text}
              {l.cites && (
                <Link
                  href="/learning"
                  className="ml-1 font-mono text-[11px] text-ink-3 underline decoration-dotted underline-offset-4"
                >
                  {l.cites.blobId ? `blob ${l.cites.blobId.slice(0, 10)}…` : l.cites.memoryId}
                </Link>
              )}
            </p>
          ))}
        </div>
      )}
      {game.status === "pre" &&
        (pickedId ? (
          <p className="text-[13px]">
            Picked, signed and queued for the next anchor.{" "}
            <Link
              href={`/p/${pickedId}`}
              className="underline decoration-dotted underline-offset-4"
            >
              See its proof
            </Link>
            .
          </p>
        ) : account ? (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              onPick(side, pct / 100);
            }}
          >
            <Button
              type="button"
              size="xs"
              variant={side === "away" ? "default" : "outline"}
              onClick={() => setSide("away")}
            >
              {game.away}
            </Button>
            <Button
              type="button"
              size="xs"
              variant={side === "home" ? "default" : "outline"}
              onClick={() => setSide("home")}
            >
              {game.home}
            </Button>
            <label className="flex items-center gap-1 font-mono text-xs text-ink-2">
              <input
                type="number"
                min={50}
                max={99}
                value={pct}
                onChange={(e) => setPct(Number(e.target.value))}
                className="w-12 border-b border-input bg-transparent text-right outline-none"
                aria-label="Confidence"
              />
              %
            </label>
            <Button type="submit" size="xs">
              Log it on record
            </Button>
            <span className="text-[12px] text-ink-3">refused after tip-off · Undo until then</span>
          </form>
        ) : (
          <p className="text-[13px] text-ink-3">
            <Link href="/me" className="underline decoration-dotted underline-offset-4">
              Sign in
            </Link>{" "}
            to log your own pick on record.
          </p>
        ))}
      {problem && <p className="text-[13px] text-miss">{problem}</p>}
    </div>
  );
}
