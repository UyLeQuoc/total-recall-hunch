import { useState } from "react";
import { Link } from "wouter";
import { AsciiArt } from "@/components/ascii-art";
import { ReplayView } from "@/components/replay-view";
import { RuleCard } from "@/components/rule-card";
import { SignIn } from "@/components/sign-in";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAccount } from "@/hooks/use-account";
import { useRuleActions } from "@/hooks/use-rule-actions";
import { meter } from "@/lib/ascii/meter";
import { cn } from "@/lib/utils";
import { type RuleView, useRule, type VersionView } from "./use-rule";

const WHEN = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

const AGAINST: Record<string, string> = {
  books: "the books",
  polymarket: "polymarket",
  kalshi: "kalshi",
};

function scorecard(v: VersionView): string {
  const s = v.onRecord;
  const tail = s.proven
    ? "Proven"
    : s.n >= 20
      ? "not Proven: behind its market"
      : `${20 - s.n} to go for Proven`;
  return `${s.n} picks · ${s.right} right · 0 hidden${v.retracted ? ` · ${v.retracted} undone` : ""} · ${tail}`;
}

function VersionBlock({ v }: { v: VersionView }) {
  const s = v.onRecord;
  const bars =
    s.n > 0
      ? meter([
          { label: `v${v.version} on record`, value: s.brier },
          { label: AGAINST[s.against.name] ?? s.against.name, value: s.against.brier },
        ])
      : null;
  return (
    <section className="flex flex-col gap-2 border-b pb-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-mono text-xs">v{v.version}</span>
        <Badge variant={v.stage === "on_record" ? "default" : "outline"}>
          {v.stage === "on_record" ? "on record" : "practice"}
        </Badge>
        {s.proven && <Badge className="bg-hit text-background">Proven</Badge>}
        <span className="font-mono text-xs text-ink-3">
          {v.onRecordAt ? `since ${WHEN.format(new Date(v.onRecordAt))}` : ""}
        </span>
      </div>
      {v.hunch && <p className="text-[13px] text-ink-2">"{v.hunch}"</p>}
      {v.stage === "on_record" && <p className="font-mono text-xs">{scorecard(v)}</p>}
      {bars && <AsciiArt text={bars} label="Brier on record against its market" />}
      {v.practice.n > 0 && (
        <p className="font-mono text-xs text-ink-3">
          practice · {v.practice.n} scored · {v.practice.right} right · Brier{" "}
          {v.practice.brier?.toFixed(3) ?? "n/a"}
        </p>
      )}
      {v.open > 0 && (
        <p className="font-mono text-xs text-ink-3">{v.open} open, waiting for results</p>
      )}
    </section>
  );
}

function Actions({ rule, reload }: { rule: RuleView; reload: () => void }) {
  const { account } = useAccount();
  const actions = useRuleActions(reload);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(rule.hunch);
  const latest = rule.record.versions[0];
  if (!rule.mine) return null;
  if (!account && !rule.isBtc && latest?.stage !== "on_record") {
    return <SignIn reason="Sign in to put this rule on record." />;
  }
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {latest?.stage !== "on_record" && !rule.isBtc && (
          <Button
            size="sm"
            disabled={actions.busy}
            onClick={() => void actions.putOnRecord(rule.id)}
          >
            Put v{latest?.version} on record
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={actions.busy}
          onClick={() => void actions.setPaused(rule.id, !rule.paused)}
        >
          {rule.paused ? "Resume" : "Pause"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing((e) => !e)}>
          Edit (new version)
        </Button>
      </div>
      {editing && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void actions.addVersion(rule.id, draft).then((out) => {
              if (out) setEditing(false);
            });
          }}
        >
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="New wording"
          />
          <p className="text-[12.5px] text-ink-3">
            An edit is a new version with its own record. It starts in practice; the old record
            stays.
          </p>
          <Button size="sm" type="submit" className="w-fit" disabled={actions.busy}>
            Compile v{(latest?.version ?? 1) + 1}
          </Button>
        </form>
      )}
      {actions.problem && <p className="text-[13px] text-miss">{actions.problem}</p>}
    </section>
  );
}

export function RulePage({ id }: { id: string }) {
  const { rule, problem, reload } = useRule(id);
  return (
    <main className="mx-auto flex w-full max-w-[752px] flex-col gap-6 px-4 pt-[10vh] pb-20">
      {problem && <p className="text-ink-2">{problem}</p>}
      {!rule && !problem && <Skeleton className="h-48 w-full" />}
      {rule && (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-2 font-mono text-xs text-ink-3">
            <span>
              RULE · {rule.id}
              {rule.paused && " · paused"}
            </span>
            {rule.owner && (
              <span>
                by {rule.owner.slice(0, 8)}…{rule.owner.slice(-4)}
              </span>
            )}
          </div>
          <RuleCard card={rule.card} compiledBy={rule.compiledBy} />
          <Actions rule={rule} reload={() => void reload()} />
          <div className="flex flex-col gap-4">
            <p className="text-xs font-medium text-ink-2">Record, per version</p>
            {rule.record.versions.map((v) => (
              <VersionBlock key={v.version} v={v} />
            ))}
          </div>
          {rule.record.picks.length > 0 && (
            <div>
              <p className="text-xs font-medium text-ink-2">Picks</p>
              <Table className="mt-1 text-[13px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Logged (UTC)</TableHead>
                    <TableHead>Game</TableHead>
                    <TableHead>Pick</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Proof</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rule.record.picks.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs text-ink-2">
                        {WHEN.format(new Date(p.pickedAt))}
                      </TableCell>
                      <TableCell>{p.label}</TableCell>
                      <TableCell>
                        {p.side} · {Math.round(p.confidence * 100)}%
                        <span className="text-ink-3"> · v{p.version ?? 1}</span>
                      </TableCell>
                      <TableCell
                        className={cn(
                          p.retracted
                            ? "text-ink-3"
                            : p.outcome === "right"
                              ? "text-hit"
                              : p.outcome === "wrong"
                                ? "text-miss"
                                : "text-ink-2",
                        )}
                      >
                        {p.retracted ? "undone" : p.outcome === "pending" ? "open" : p.outcome}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {p.stage === "on_record" ? (
                          <Link
                            href={`/p/${p.id}`}
                            className="underline decoration-dotted underline-offset-4"
                          >
                            {p.anchored ? "verify" : "signed"}
                          </Link>
                        ) : (
                          <span className="text-ink-3">practice</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {rule.record.fires.length > 0 && (
            <div>
              <p className="text-xs font-medium text-ink-2">Why it did or didn't fire</p>
              <ul className="mt-1 flex flex-col font-mono text-xs">
                {rule.record.fires.map((f) => (
                  <li key={`${f.at}-${f.eventId}`} className="flex gap-3 border-b py-1">
                    <span className="w-24 shrink-0 text-ink-3">{WHEN.format(new Date(f.at))}</span>
                    <span className={cn("w-10 shrink-0", f.fired ? "text-hit" : "text-ink-3")}>
                      {f.fired ? "fired" : "no"}
                    </span>
                    <span className="min-w-0 text-ink-2">{f.why.join(" · ")}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <p className="mb-2 text-xs font-medium text-ink-2">Replay, last 7 days</p>
            <ReplayView replay={rule.replay} isBtc={rule.isBtc} />
          </div>
        </>
      )}
    </main>
  );
}
