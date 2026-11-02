import { AsciiArt } from "@/components/ascii-art";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { lineChart } from "@/lib/ascii/lines";
import { cn } from "@/lib/utils";
import { type Learning, useLearning } from "./use-learning";

const NAME: Record<string, string> = {
  books: "the books (consensus)",
  polymarket: "Polymarket",
  kalshi: "Kalshi",
};

function voiceName(voice: string): string {
  return NAME[voice] ?? (voice.startsWith("book:") ? voice.slice(5) : voice);
}

function chart(curve: Learning["curve"]): string {
  return lineChart(
    [
      {
        label: "the books",
        mark: "·",
        values: curve.flatMap((p) => (p.books === null ? [] : [p.books])),
      },
      { label: "plain average", mark: "○", values: curve.map((p) => p.plain) },
      { label: "trust-weighted call", mark: "●", values: curve.map((p) => p.call) },
    ],
    60,
    10,
    (v) => v.toFixed(3),
  );
}

const LEVEL = 0.0005;
const MIN_GAMES = 5;

function compare(a: number, b: number): string {
  if (Math.abs(a - b) < LEVEL) return "level with";
  return a < b ? "ahead of" : "behind";
}

function headline(curve: Learning["curve"]): string {
  const last = curve.at(-1);
  if (!last) return "No resolved games with prices yet.";
  const books =
    last.books === null
      ? ""
      : ` and ${compare(last.call, last.books)} the books (${last.books.toFixed(4)})`;
  return `After ${last.n} games, the trust-weighted call scores ${last.call.toFixed(4)}: ${compare(last.call, last.plain)} the plain average (${last.plain.toFixed(4)})${books}.`;
}

export function LearningPage() {
  const { data, problem } = useLearning();
  return (
    <main className="mx-auto flex w-full max-w-[752px] flex-col gap-6 px-4 pt-[10vh] pb-20">
      <div>
        <h1 className="text-[15px] font-semibold">How Hunch learns who to trust</h1>
        <p className="mt-1 text-[13px] text-ink-3">
          Every resolved NBA game scores every source. Those scores become trust lines in Walrus
          Memory, and the agent's call weighs each source by them. The chart replays that game by
          game, never peeking ahead: cumulative Brier, lower is better.
        </p>
      </div>
      {problem && <p className="text-ink-2">{problem}</p>}
      {!data && !problem && <Skeleton className="h-48 w-full" />}
      {data && (
        <>
          <p className="text-[15px] leading-[1.9]">
            <strong className="font-semibold">{headline(data.curve)}</strong>
            <span className="text-ink-2"> Reported as it comes out, whichever way it falls.</span>
          </p>
          {data.curve.length > MIN_GAMES && (
            <AsciiArt
              text={chart(data.curve.filter((p) => p.n >= MIN_GAMES))}
              label="Cumulative Brier over time"
            />
          )}
          <Table className="text-[13px]">
            <TableHeader>
              <TableRow>
                <TableHead>Voice</TableHead>
                <TableHead>Games</TableHead>
                <TableHead>Brier</TableHead>
                <TableHead>Favourite won</TableHead>
                <TableHead>Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.voices.map((v) => (
                <TableRow key={v.voice}>
                  <TableCell>{voiceName(v.voice)}</TableCell>
                  <TableCell className="font-mono text-xs">{v.n}</TableCell>
                  <TableCell className="font-mono text-xs">{v.brier.toFixed(4)}</TableCell>
                  <TableCell className="font-mono text-xs">{Math.round(v.hit * 100)}%</TableCell>
                  <TableCell className="font-mono text-xs text-ink-2">{v.trend}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div>
            <p className="text-xs font-medium text-ink-2">The memory behind the weights</p>
            <ul className="mt-1 flex flex-col font-mono text-xs">
              {data.memories.map((m) => (
                <li key={m.id} className="flex flex-col gap-0.5 border-b py-1.5">
                  <span className="break-words">{m.text}</span>
                  <span className={cn(m.status === "written" ? "text-hit" : "text-ink-3")}>
                    {m.id} ·{" "}
                    {m.status === "written" && m.blobId
                      ? `on Walrus · blob ${m.blobId}`
                      : m.status === "pending"
                        ? "queued for Walrus Memory"
                        : m.status === "test"
                          ? "kept here: a test account's line never goes to Walrus"
                          : m.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </main>
  );
}
