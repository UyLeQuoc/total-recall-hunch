import { Link } from "wouter";
import { AsciiArt } from "@/components/ascii-art";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useVerify, type Verification } from "./use-verify";

const WHEN = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "UTC",
});

const HEADLINE: Record<Verification["verdict"], string> = {
  verified: "Verified. Logged before lock, signed, and anchored on Sui.",
  pending: "Signed and logged before lock. Waiting for its anchor batch.",
  failed: "This pick does not verify.",
  practice: "A practice pick: scored, but not signed or anchored.",
};

function checkBlock(checks: Verification["checks"]): string {
  return checks
    .map((c) => `${c.ok === null ? "…" : c.ok ? "✓" : "✗"} ${c.name}\n    ${c.detail}`)
    .join("\n");
}

export function VerifyPage({ id }: { id: string }) {
  const { data, problem } = useVerify(id);
  return (
    <main className="mx-auto flex w-full max-w-[752px] flex-col gap-5 px-4 pt-[10vh] pb-20">
      <h1 className="font-mono text-xs text-ink-3">PROOF · {id}</h1>
      {problem && <p className="text-ink-2">{problem}</p>}
      {!data && !problem && <Skeleton className="h-40 w-full" />}
      {data && (
        <>
          <p className="text-[15px] leading-[1.9]">
            <strong
              className={cn(
                "font-semibold",
                data.verdict === "verified"
                  ? "text-hit"
                  : data.verdict === "failed"
                    ? "text-miss"
                    : "",
              )}
            >
              {HEADLINE[data.verdict]}
            </strong>
          </p>
          <section className="rounded-lg bg-muted px-3.5 py-3 font-mono text-[12.5px] leading-[1.75]">
            <div>
              <span className="text-ink-3">PICK · </span>
              {data.pick.label} · <span className="font-medium">{data.pick.team}</span> ·{" "}
              {Math.round(data.pick.confidence * 100)}%{data.pick.retracted && " · undone"}
            </div>
            <div>
              <span className="text-ink-3">LOGGED </span>
              {WHEN.format(new Date(data.pick.pickedAt))} UTC{" "}
              <span className="text-ink-3">· LOCK </span>
              {WHEN.format(new Date(data.pick.lock))} UTC
            </div>
            <div>
              <span className="text-ink-3">RESULT </span>
              {data.pick.retracted ? "not scored (undone)" : data.pick.outcome}
            </div>
            <div className="truncate">
              <span className="text-ink-3">WHY </span>
              {data.pick.why}
            </div>
            {data.pick.owner && (
              <div className="truncate">
                <span className="text-ink-3">BY </span>
                {data.pick.owner}
              </div>
            )}
            {data.pick.ruleId && (
              <div>
                <span className="text-ink-3">RULE </span>
                <Link
                  href={`/r/${data.pick.ruleId}`}
                  className="underline decoration-dotted underline-offset-4"
                >
                  {data.pick.ruleId}
                </Link>
              </div>
            )}
          </section>
          {data.checks.length > 0 && (
            <AsciiArt text={checkBlock(data.checks)} label="Verification checks" />
          )}
          {data.anchor?.digest && (
            <p className="font-mono text-xs break-all text-ink-2">
              anchor · {data.anchor.network} · tx {data.anchor.digest} · root {data.anchor.root}
            </p>
          )}
          {data.hash && (
            <p className="font-mono text-xs break-all text-ink-3">pick sha256 · {data.hash}</p>
          )}
          <p className="text-[12.5px] text-ink-3">
            Anyone can run these checks: the pick's hash, the agent's signature, the owner's signed
            delegation, the Merkle proof, and the anchor transaction read back from Sui through
            Tatum's gRPC.
          </p>
        </>
      )}
    </main>
  );
}
