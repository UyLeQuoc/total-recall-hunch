import type { Db } from "../db/client.ts";
import { storedFiveMinute } from "../ingest/btc.ts";
import { loadPastGames } from "../monitor/history.ts";
import { REPLAY_DAYS, type Replay, replayBtc, replaySports } from "../monitor/replay.ts";
import { type RuleCard, ruleCard } from "./card.ts";
import { type CompilerConfig, compileHunch } from "./compile.ts";
import { isBtcRule, type Rule } from "./rule.ts";
import { saveRule } from "./store.ts";

export type HunchEvent =
  | { type: "step"; text: string }
  | { type: "rule"; id: string; card: RuleCard; rule: Rule; compiledBy: string }
  | { type: "replay"; replay: Replay }
  | { type: "question"; question: string }
  | { type: "refused"; reason: string };

export async function replayRule(db: Db, rule: Rule, now: Date): Promise<Replay> {
  const from = new Date(now.getTime() - REPLAY_DAYS * 86_400_000);
  if (isBtcRule(rule)) return replayBtc(rule, await storedFiveMinute(db, from), now);
  return replaySports(rule, await loadPastGames(db, from, now, rule.scope.league[0]), now);
}

export async function runHunch(
  db: Db,
  config: CompilerConfig,
  owner: string,
  hunch: string,
  emit: (e: HunchEvent) => Promise<void>,
  onModelError: (reason: string) => void,
): Promise<void> {
  const now = new Date();
  await emit({ type: "step", text: "Reading your hunch" });
  await emit({
    type: "step",
    text: config.apiKey
      ? "Compiling it with the model"
      : "Matching it to a known shape (no model key)",
  });
  const compiled = await compileHunch(hunch, now, config, onModelError);
  if (compiled.kind === "question") {
    await emit({ type: "question", question: compiled.question });
    return;
  }
  if (compiled.kind === "refused") {
    await emit({ type: "refused", reason: compiled.reason });
    return;
  }
  const stored = await saveRule(db, owner, hunch, compiled.rule, compiled.by);
  await emit({
    type: "rule",
    id: stored.id,
    card: ruleCard(compiled.rule),
    rule: compiled.rule,
    compiledBy: compiled.by,
  });
  await emit({
    type: "step",
    text: isBtcRule(compiled.rule)
      ? "Replaying 7 days of 5-minute BTC candles"
      : compiled.rule.scope.league[0] === "SENATE"
        ? "Replaying the last 7 days of resolved Senate races"
        : "Replaying 7 days of NBA games against stored prices",
  });
  const replay = await replayRule(db, compiled.rule, now);
  await emit({
    type: "step",
    text: `${replay.considered} ${isBtcRule(compiled.rule) ? "windows" : compiled.rule.scope.league[0] === "SENATE" ? "races" : "games"} checked · ${replay.fires} fires`,
  });
  await emit({ type: "replay", replay });
}
