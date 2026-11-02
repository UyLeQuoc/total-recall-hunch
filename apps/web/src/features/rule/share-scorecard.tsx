import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ShareScorecardProps {
  ruleId: string;
  title: string;
  scorecard: string;
}

export function ShareScorecard({ ruleId, title, scorecard }: ShareScorecardProps) {
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const text = `${title}: ${scorecard}. Every pick logged before lock, anchored on Sui.`;
  const url = `${window.location.origin}/r/${ruleId}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="xs" variant="outline" onClick={() => void copy()}>
        {copied === "copied" ? "Copied" : "Copy scorecard"}
      </Button>
      <Button size="xs" variant="ghost" asChild>
        <a
          href={`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noreferrer"
        >
          Post on X
        </a>
      </Button>
      {copied === "failed" && (
        <span className="text-[12px] text-ink-3">This browser blocked the clipboard.</span>
      )}
    </div>
  );
}
