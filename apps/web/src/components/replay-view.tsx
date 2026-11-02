import { AsciiArt } from "@/components/ascii-art";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEase } from "@/hooks/use-frame";
import { dayBars } from "@/lib/ascii/bars";
import { meter } from "@/lib/ascii/meter";
import { dayLabel, pct, utcMinute } from "@/lib/format";
import type { Replay } from "@/lib/rule-schemas";
import { cn } from "@/lib/utils";
import { type ReplayKind, replayFootnotes, replayHeadline, replayVerdict } from "./replay-copy";

interface ReplayViewProps {
  replay: Replay;
  kind: ReplayKind;
}

const AGAINST_LABEL: Record<string, string> = {
  books: "the books",
  polymarket: "polymarket",
  kalshi: "kalshi",
};

export function ReplayView({ replay, kind }: ReplayViewProps) {
  const isBtc = kind === "btc";
  const progress = useEase(900, replay);
  const today = replay.days.at(-1)?.day ?? "";
  const bars = dayBars(
    replay.days.map((d) => ({ label: dayLabel(d.day, today), fires: d.fires, right: d.right })),
    7,
    progress,
  );
  const scores = meter([
    { label: "your rule", value: replay.brier === null ? null : replay.brier * progress },
    {
      label: AGAINST_LABEL[replay.against.name] ?? replay.against.name,
      value: replay.against.brier === null ? null : replay.against.brier * progress,
    },
  ]);
  const verdict = replayVerdict(replay);
  return (
    <section className="flex flex-col gap-4 animate-fade-up">
      <p className="text-[15px] leading-[1.9]">
        <strong className="font-semibold">{replayHeadline(replay, kind)}</strong>
        {verdict && <span className="text-ink-2"> {verdict}</span>}
      </p>
      {replay.fires > 0 && (
        <>
          <div>
            <div className="mb-1 font-mono text-[11px] text-ink-3">
              fires per day · <span className="text-foreground">████</span> right{" "}
              <span className="text-foreground">░░░░</span> wrong
            </div>
            <AsciiArt text={bars} label={replayHeadline(replay, kind)} />
          </div>
          <div>
            <div className="mb-1 font-mono text-[11px] text-ink-3">
              brier score · lower is better
            </div>
            <AsciiArt text={scores} label="Brier scores" />
          </div>
        </>
      )}
      {replay.recent.length > 0 && (
        <Table className="text-[13px]">
          <TableHeader>
            <TableRow>
              <TableHead>When (UTC)</TableHead>
              <TableHead>{isBtc ? "Move" : kind === "senate" ? "Race" : "Game"}</TableHead>
              <TableHead>Pick</TableHead>
              <TableHead>Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {replay.recent.map((f) => (
              <TableRow key={`${f.at}-${f.label}`}>
                <TableCell className="font-mono text-xs text-ink-2">
                  {f.at.slice(5, 10)} {utcMinute(f.at)}
                </TableCell>
                <TableCell>{f.label}</TableCell>
                <TableCell>
                  {f.pick} · {pct(f.confidence)}
                </TableCell>
                <TableCell className={cn(f.right ? "text-hit" : "text-miss")}>
                  {f.right ? "✓ right" : "✗ wrong"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {replayFootnotes(replay, kind).map((n) => (
        <p key={n} className="text-[12.5px] text-ink-3">
          {n}
        </p>
      ))}
    </section>
  );
}
