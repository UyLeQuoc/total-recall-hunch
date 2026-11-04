import { Link } from "wouter";
import { SignIn } from "@/components/sign-in";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAccount } from "@/hooks/use-account";
import { useNow } from "@/hooks/use-frame";
import { cn } from "@/lib/utils";
import { useMe } from "./use-me";

const WHEN = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

function short(address: string): string {
  return `${address.slice(0, 8)}…${address.slice(-4)}`;
}

export function MePage() {
  const { account, signOut } = useAccount();
  const { me, problem, undoing, undo, pauseAll } = useMe(account !== null);
  const now = useNow(30_000, true);

  if (!account) {
    return (
      <main className="mx-auto w-full max-w-[752px] px-4 pt-[10vh] pb-20">
        <h1 className="mb-4 text-[15px] font-semibold">Your record</h1>
        <SignIn reason="Sign in to put rules on record, pick by hand, and get a notification with Undo when a rule fires." />
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[752px] flex-col gap-7 px-4 pt-[10vh] pb-20">
      <div>
        <h1 className="text-[15px] font-semibold">Your record</h1>
        <p className="mt-1 font-mono text-xs text-ink-2">
          {short(account.address)}
          {account.test && " (test)"} · Hunch may sign up to {account.perDay} picks a day until{" "}
          {account.until} ·{" "}
          <button
            type="button"
            className="underline decoration-dotted underline-offset-4"
            onClick={signOut}
          >
            sign out
          </button>
        </p>
      </div>
      {problem && <p className="text-ink-2">{problem}</p>}

      {me && me.notifications.length > 0 && (
        <section>
          <p className="text-xs font-medium text-ink-2">Notifications</p>
          <ul className="mt-1 flex flex-col">
            {me.notifications.map((n) => {
              const pick = me.picks.find((p) => p.id === n.pickId);
              const canUndo = pick && !pick.retracted && Date.parse(pick.lock) > now;
              return (
                <li key={n.id} className="flex items-baseline gap-3 border-b py-1.5 text-[12.5px]">
                  <span className="w-28 shrink-0 font-mono text-xs text-ink-3">
                    {WHEN.format(new Date(n.at))}
                  </span>
                  <span className="min-w-0 flex-1">{n.text}</span>
                  {n.pickId && (
                    <Link
                      href={`/p/${n.pickId}`}
                      className="font-mono text-xs text-ink-2 hover:text-foreground"
                    >
                      proof
                    </Link>
                  )}
                  {canUndo && pick && (
                    <button
                      type="button"
                      className="font-mono text-xs text-miss"
                      disabled={undoing === pick.id}
                      onClick={() => void undo(pick.id)}
                    >
                      undo before {WHEN.format(new Date(pick.lock))}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {me && (
        <section>
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-medium text-ink-2">Rules</p>
            {me.rules.some((r) => !r.paused) && (
              <Button size="xs" variant="ghost" onClick={() => void pauseAll()}>
                Pause all
              </Button>
            )}
          </div>
          {me.rules.length === 0 ? (
            <p className="mt-1 text-[13px] text-ink-3">
              No rules yet.{" "}
              <Link href="/" className="underline decoration-dotted underline-offset-4">
                Say a hunch
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-1 flex flex-col">
              {me.rules.map((r) => (
                <li key={r.id} className="flex items-baseline gap-3 border-b py-1.5 text-[12.5px]">
                  <Link href={`/r/${r.id}`} className="min-w-0 flex-1 hover:underline">
                    {r.name}
                  </Link>
                  <span className="font-mono text-xs text-ink-3">
                    v{r.version} · {r.stage === "on_record" ? "on record" : "practice"}
                    {r.paused && " · paused"} · {r.picks} picks
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {me && me.picks.length > 0 && (
        <section>
          <p className="text-xs font-medium text-ink-2">Picks on record</p>
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
              {me.picks.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs text-ink-2">
                    {WHEN.format(new Date(p.pickedAt))}
                  </TableCell>
                  <TableCell>{p.label}</TableCell>
                  <TableCell>
                    {p.team} · {Math.round(p.confidence * 100)}%
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
                  <TableCell>
                    <Link
                      href={`/p/${p.id}`}
                      className="font-mono text-xs underline decoration-dotted underline-offset-4"
                    >
                      verify
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}
    </main>
  );
}
