import { useState } from "react";
import { Link } from "wouter";
import { SignIn } from "@/components/sign-in";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/hooks/use-account";
import { useRuleActions } from "@/hooks/use-rule-actions";
import type { CompiledRule } from "./use-hunch";

interface RecordActionsProps {
  rule: CompiledRule;
  practiceBusy: boolean;
  onPractice: () => void;
  onEdit: () => void;
}

export function RecordActions({ rule, practiceBusy, onPractice, onEdit }: RecordActionsProps) {
  const { account } = useAccount();
  const [onRecord, setOnRecord] = useState(false);
  const [askSignIn, setAskSignIn] = useState(false);
  const actions = useRuleActions();
  const record = async () => {
    if (!account) {
      setAskSignIn(true);
      return;
    }
    const out = await actions.putOnRecord(rule.id);
    if (out) setOnRecord(true);
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onPractice} disabled={practiceBusy}>
          See one scored now
        </Button>
        {!rule.isBtc && !onRecord && (
          <Button size="sm" variant="outline" disabled={actions.busy} onClick={() => void record()}>
            Put it on record
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onEdit}>
          Edit
        </Button>
      </div>
      {onRecord ? (
        <p className="text-[13px]">
          <strong className="font-semibold">On record.</strong> From now on, every pick it makes is
          signed before tip-off and anchored on Sui.{" "}
          <Link href={`/r/${rule.id}`} className="underline decoration-dotted underline-offset-4">
            Open the rule's page
          </Link>
          .
        </p>
      ) : (
        <p className="text-[12.5px] text-ink-3">
          "See one scored now" runs a BTC practice pick that scores in 5 minutes.{" "}
          {rule.isBtc
            ? "BTC rules stay in practice; NBA rules go on record."
            : "On record, every pick is signed before tip-off and anchored on Sui."}{" "}
          <Link href={`/r/${rule.id}`} className="underline decoration-dotted underline-offset-4">
            Rule page
          </Link>
        </p>
      )}
      {askSignIn && !account && <SignIn reason="Sign in once to put this rule on record." />}
      {actions.problem && <p className="text-[13px] text-miss">{actions.problem}</p>}
    </div>
  );
}
