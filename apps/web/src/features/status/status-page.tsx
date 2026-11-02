import { AsciiArt } from "@/components/ascii-art";
import { Skeleton } from "@/components/ui/skeleton";
import { uptimeRow } from "@/lib/ascii/uptime";
import { cn } from "@/lib/utils";
import { type Status, useStatus } from "./use-status";

const KEYS: { key: keyof Status["keys"]; env: string; unlocks: string }[] = [
  {
    key: "agent",
    env: "HUNCH_AGENT_KEY",
    unlocks: "sign picks under each delegation (`bun run keys:dev`)",
  },
  {
    key: "model",
    env: "OPENROUTER_API_KEY",
    unlocks: "compile any wording, not just the known shapes",
  },
  {
    key: "tatum",
    env: "TATUM_API_KEY_TESTNET",
    unlocks: "Sui calls: anchors, verify pages, Predict",
  },
  {
    key: "odds",
    env: "ODDS_API_KEY",
    unlocks: "FanDuel, BetMGM, Caesars, Pinnacle and Betfair next to DraftKings",
  },
  { key: "sponsor", env: "SUI_SPONSOR_KEY", unlocks: "pay the anchors' gas on testnet" },
  { key: "anchor", env: "HUNCH_PACKAGE_ID", unlocks: "hunch::anchor, after `sui client publish`" },
  {
    key: "memory",
    env: "MEMWAL_ACCOUNT_ID",
    unlocks: "trust snapshots in Walrus Memory (mainnet)",
  },
];

const HM = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

function uptimeBlock(s: Status): string {
  const width = Math.max(...s.sources.map((x) => x.source.length));
  const head = `${"".padEnd(width)}  ${"-24h".padEnd(20)}now   last`;
  const rows = s.sources.map(
    (x) =>
      `${x.source.padEnd(width)}  ${uptimeRow(x.hourly)}  ${x.last ? `${HM.format(new Date(x.last))} UTC` : "never"}`,
  );
  return [head, ...rows].join("\n");
}

export function StatusPage() {
  const { status, problem } = useStatus();
  const calls = status ? Object.entries(status.tatum.calls) : [];
  return (
    <main className="mx-auto w-full max-w-[752px] px-4 pt-[10vh] pb-20">
      <h1 className="text-[15px] font-semibold">Status</h1>
      <p className="mt-1 text-[13px] text-ink-3">
        Every source's snapshots per hour, the replay's backfill, and Tatum's meter. Polling never
        touches Tatum.
      </p>
      {problem && <p className="mt-4 text-ink-2">{problem}</p>}
      {!status && !problem && <Skeleton className="mt-6 h-32 w-full" />}
      {status && (
        <div className="mt-6 flex flex-col gap-6">
          <AsciiArt text={uptimeBlock(status)} label="Snapshots per hour for each source" />
          <p className="font-mono text-xs text-ink-2">
            backfill · {status.backfill.withPrices} of {status.backfill.games} finished games with
            prices · {status.backfill.btcCandles.toLocaleString("en-US")} BTC 5-min candles
          </p>
          <p className="font-mono text-xs text-ink-2">
            tatum today · {status.tatum.credits} of {status.tatum.budget} credits
            {calls.length > 0 && ` · ${calls.map(([m, n]) => `${m} ${n}`).join(" · ")}`}
            {status.tatum.fallback && " · on the public fullnode after a 402"}
          </p>
          <p className="font-mono text-xs text-ink-2">
            the odds api ·{" "}
            {status.oddsApi.key
              ? `${status.oddsApi.calls} of ${status.oddsApi.cap} calls today${status.oddsApi.remaining === null ? "" : ` · ${status.oddsApi.remaining} credits left this month`} · ${status.oddsApi.books.join(", ")}`
              : "no key (ODDS_API_KEY): the books are DraftKings via ESPN only"}
          </p>
          <p className="font-mono text-xs text-ink-2">
            on record · {status.onRecord.rules} rules · {status.onRecord.picks} picks ·{" "}
            {status.onRecord.delegations} delegations
          </p>
          <p className="font-mono text-xs text-ink-2">
            anchors ({status.network}) · {status.anchors.batches} batches ·{" "}
            {status.anchors.pendingPicks} picks waiting
            {status.anchors.last &&
              ` · last ${status.anchors.last.status}, ${status.anchors.last.count} picks${status.anchors.last.digest ? `, tx ${status.anchors.last.digest.slice(0, 10)}…` : ""}`}
          </p>
          <p className="font-mono text-xs text-ink-2">
            walrus memory ·{" "}
            {Object.keys(status.memories).length === 0
              ? "no lines yet"
              : Object.entries(status.memories)
                  .map(([k, n]) => `${n} ${k}`)
                  .join(" · ")}
            {!status.keys.memory && " (queued until the account key is set)"}
          </p>
          {status.agent && (
            <p className="font-mono text-xs break-all text-ink-3">agent · {status.agent}</p>
          )}
          <div>
            <p className="text-xs font-medium text-ink-2">Keys</p>
            <ul className="mt-1 flex flex-col">
              {KEYS.map((k) => (
                <li key={k.key} className="flex gap-3 border-b py-1.5 text-[12.5px]">
                  <span
                    className={cn("w-4 font-mono", status.keys[k.key] ? "text-hit" : "text-ink-3")}
                  >
                    {status.keys[k.key] ? "✓" : "·"}
                  </span>
                  <span className="w-52 shrink-0 font-mono text-xs">{k.env}</span>
                  <span className="text-ink-2">{k.unlocks}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </main>
  );
}
