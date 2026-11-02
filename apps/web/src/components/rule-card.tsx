import type { Card } from "@/lib/rule-schemas";

interface RuleCardProps {
  card: Card;
  compiledBy: string;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8ch_1fr] gap-x-2">
      <span className="text-ink-3">{label}</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

export function RuleCard({ card, compiledBy }: RuleCardProps) {
  return (
    <section className="animate-fade-up rounded-lg bg-muted px-3.5 py-3 font-mono text-[12.5px] leading-[1.75]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <span>
          <span className="text-ink-3">RULE · </span>
          <span className="font-medium">{card.title}</span>
        </span>
        <span className="text-ink-3">
          v{card.version} · compiled ✓ · {card.stage}
        </span>
      </div>
      <div className="text-ink-3">WHEN (all must hold)</div>
      {card.when.map((w) => (
        <div key={w} className="pl-[2ch]">
          {w}
        </div>
      ))}
      <div className="text-ink-3">THEN</div>
      <div className="pl-[2ch]">{card.then.join(" · ")}</div>
      <Row label="AGAINST">{card.against}</Row>
      <Row label="LIMITS">{card.limits}</Row>
      <div className="mt-1 text-[11px] text-ink-3">
        {compiledBy === "model"
          ? "compiled by the model, checked against the schema"
          : "matched a known shape · set OPENROUTER_API_KEY to compile any wording"}
      </div>
    </section>
  );
}
