import { useState } from "react";
import { ReplayView } from "@/components/replay-view";
import { RuleCard } from "@/components/rule-card";
import { useVisitor } from "@/hooks/use-visitor";
import { EXAMPLES } from "./examples";
import { PracticeTurn } from "./practice-turn";
import { PromptLine } from "./prompt-line";
import { RecordActions } from "./record-actions";
import { Suggestions } from "./suggestions";
import { Thinking } from "./thinking";
import { useHunch } from "./use-hunch";
import { usePractice } from "./use-practice";

export function HunchPage() {
  const visitor = useVisitor();
  const hunch = useHunch(visitor);
  const practice = usePractice(visitor);
  const [draft, setDraft] = useState("");
  const [recordedId, setRecordedId] = useState<string | null>(null);

  const ask = (text: string) => {
    setDraft(text);
    void hunch.ask(text);
  };
  const others = EXAMPLES.filter((e) => e !== hunch.hunch);

  return (
    <main className="mx-auto w-full max-w-[752px] px-4 pt-[18vh] pb-20 max-md:pt-[8vh]">
      <PromptLine
        value={draft}
        busy={hunch.status === "thinking"}
        onChange={setDraft}
        onSubmit={ask}
      />
      {hunch.status === "idle" && (
        <>
          <p className="mt-2 text-[13px] text-ink-3">
            Say it, and Hunch replays it on the last 7 days. Practice by default · no wallet · no
            real money.
          </p>
          <Suggestions onPick={ask} />
        </>
      )}

      {hunch.status !== "idle" && hunch.startedAt !== null && (
        <Thinking
          steps={hunch.steps}
          active={hunch.status === "thinking"}
          startedAt={hunch.startedAt}
          endedAt={hunch.endedAt}
        />
      )}

      {hunch.status === "done" && (
        <div className="mt-6 flex flex-col gap-5">
          {hunch.question && (
            <p className="text-[15px] leading-[1.9]">
              <strong className="font-semibold">One question first:</strong> {hunch.question}
              <span className="text-ink-3"> Rewrite the hunch above with the answer.</span>
            </p>
          )}
          {hunch.problem && <p className="text-[15px] leading-[1.9] text-ink-2">{hunch.problem}</p>}
          {hunch.rule && (
            <RuleCard
              card={
                recordedId === hunch.rule.id
                  ? { ...hunch.rule.card, stage: "on record" }
                  : hunch.rule.card
              }
              compiledBy={hunch.rule.compiledBy}
            />
          )}
          {hunch.rule && hunch.replay && (
            <ReplayView replay={hunch.replay} kind={hunch.rule.kind} />
          )}
          {hunch.rule && (
            <RecordActions
              rule={hunch.rule}
              practiceBusy={practice.status === "starting" || practice.status === "live"}
              onPractice={() => void practice.start(hunch.rule?.isBtc ? hunch.rule.id : undefined)}
              onEdit={() => hunch.reset()}
              onRecorded={() => setRecordedId(hunch.rule?.id ?? null)}
            />
          )}
          {practice.status !== "idle" || practice.problem ? (
            <PracticeTurn
              status={practice.status}
              pick={practice.pick}
              card={practice.card}
              btc={practice.btc}
              secondsLeft={practice.secondsLeft}
              problem={practice.problem}
            />
          ) : null}
          <div>
            <p className="text-xs font-medium text-ink-2">Try another</p>
            <ul className="mt-0.5 flex flex-col">
              {others.map((e) => (
                <li key={e}>
                  <button
                    type="button"
                    onClick={() => ask(e)}
                    className="-mx-1.5 w-[calc(100%+12px)] rounded-md border-b px-1.5 py-1.5 text-left text-[12.5px] hover:bg-accent"
                  >
                    {e}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </main>
  );
}
