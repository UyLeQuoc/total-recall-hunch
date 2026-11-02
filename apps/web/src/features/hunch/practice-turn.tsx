import { AsciiArt } from "@/components/ascii-art";
import { candles } from "@/lib/ascii/candles";
import {
  brier,
  countdown,
  money,
  pct,
  signedPct,
  utcClock,
  utcMinute,
  wholeDollars,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Btc, Card, Pick } from "./api";

interface PracticeTurnProps {
  status: "idle" | "starting" | "live" | "scored";
  pick: Pick | null;
  card: Card | null;
  btc: Btc | null;
  secondsLeft: number;
  problem: string | null;
}

const CANDLES = 20;

export function PracticeTurn({ status, pick, card, btc, secondsLeft, problem }: PracticeTurnProps) {
  if (status === "starting") {
    return <p className="shimmer text-[14.5px] font-medium">Reading BTC's last 5 minutes</p>;
  }
  if (!pick || !card) return problem ? <p className="text-ink-2">{problem}</p> : null;
  const chart =
    btc && btc.minutes.length > 0
      ? candles(
          btc.minutes.slice(-CANDLES).map((m) => ({ ...m, label: utcMinute(m.at) })),
          {
            rows: 12,
            entry: pick.entryPrice ?? undefined,
            price: pick.outcome === "pending" ? btc.price : (pick.exitPrice ?? undefined),
            format: wholeDollars,
          },
        )
      : null;
  return (
    <section className="flex flex-col gap-3 animate-fade-up">
      <div className="font-mono text-[11px] text-ink-3">
        PRACTICE · {card.title} · {card.then.join(" · ")}
      </div>
      <p className="text-[15px] leading-[1.9]">
        Picked <strong className="font-semibold uppercase">{pick.side}</strong>
        {pick.entryPrice !== null && <> at {money(pick.entryPrice)}</>} · confidence{" "}
        {pct(pick.confidence)} · scored at {utcClock(pick.expiresAt)}.
        <span className="text-ink-3"> Why: {pick.why}.</span>
      </p>
      {chart && <AsciiArt text={chart} label="BTC/USD, last 20 minutes" />}
      {pick.outcome === "pending" ? (
        <p className="font-mono text-xs text-ink-2">
          {secondsLeft > 0 ? `${countdown(secondsLeft)} left` : "scoring…"} · the first BTC price
          after {utcClock(pick.expiresAt)} decides it
        </p>
      ) : (
        <p className="text-[15px] leading-[1.9]">
          <strong
            className={cn("font-semibold", pick.outcome === "right" ? "text-hit" : "text-miss")}
          >
            {pick.outcome === "right" ? "✓ Right." : "✗ Wrong."}
          </strong>{" "}
          {pick.entryPrice !== null && pick.exitPrice !== null && (
            <>
              {money(pick.entryPrice)} → {money(pick.exitPrice)} (
              {signedPct(pick.entryPrice, pick.exitPrice)})
              {pick.exitAt && <> at {utcClock(pick.exitAt)}</>}
            </>
          )}{" "}
          · Brier {brier(pick.brier)}.
          <span className="text-ink-2">
            {" "}
            That's a scored pick. On record, each one is signed and anchored on Sui before it locks.
          </span>
        </p>
      )}
      {problem && <p className="text-[12.5px] text-ink-3">{problem}</p>}
    </section>
  );
}
