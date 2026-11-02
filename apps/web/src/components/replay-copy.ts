import { brier } from "@/lib/format";
import type { Replay } from "@/lib/rule-schemas";

const SOURCE: Record<string, string> = {
  books: "the books'",
  polymarket: "Polymarket's",
  kalshi: "Kalshi's",
};

export type ReplayKind = "btc" | "nba" | "senate";

const UNIT: Record<ReplayKind, string> = { btc: "5-minute windows", nba: "games", senate: "races" };

export function replayHeadline(r: Replay, kind: ReplayKind): string {
  const unit = UNIT[kind];
  if (r.considered === 0) {
    return kind === "senate"
      ? "No Senate race has resolved yet: this rule's record starts on election night."
      : `Nothing to replay yet: no ${unit} with results in the last 7 days.`;
  }
  if (r.fires === 0) {
    const missing = r.skipped > 0 ? ` (${r.skipped} had no stored prices)` : "";
    return `Last 7 days: no fires across ${r.considered.toLocaleString("en-US")} ${unit}${missing}.`;
  }
  const against = SOURCE[r.against.name] ?? `${r.against.name}'s`;
  const vs =
    r.against.brier === null
      ? ""
      : `, ${against} ${brier(r.against.brier)} on the same ${kind === "btc" ? "windows" : unit}`;
  return `Last 7 days: ${r.fires} fires, ${r.right} right. Brier ${brier(r.brier)}${vs}.`;
}

export function replayVerdict(r: Replay): string | null {
  if (r.brier === null || r.against.brier === null || r.fires === 0) return null;
  const ahead = r.brier < r.against.brier;
  const small =
    r.fires < 20 ? ` Only ${r.fires} fires, so it's early: Proven needs 20 on record.` : "";
  return `${ahead ? "Ahead of" : "Behind"} the market it bets against so far.${small}`;
}

export function replayFootnotes(r: Replay, kind: ReplayKind): string[] {
  const notes: string[] = [];
  if (r.skipped > 0)
    notes.push(
      `${r.skipped} of ${r.considered} ${kind === "senate" ? "races" : "games"} skipped: no stored price from a source the rule reads.`,
    );
  if (r.closingLines > 0) {
    notes.push(
      `${r.closingLines} fires read the books' closing line (backfilled), not a live snapshot.`,
    );
  }
  if (kind === "btc")
    notes.push(
      "No DeepBook Predict prices are stored yet, so BTC rules are compared with a coin flip (0.250).",
    );
  return notes;
}
