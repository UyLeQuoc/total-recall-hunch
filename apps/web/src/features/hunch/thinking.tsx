import { useMemo } from "react";
import { AsciiArt } from "@/components/ascii-art";
import { useFrame } from "@/hooks/use-frame";
import { type Contact, radarFrame } from "@/lib/ascii/radar";
import { cn } from "@/lib/utils";

interface ThinkingProps {
  steps: string[];
  active: boolean;
  startedAt: number;
  endedAt: number | null;
}

const COLS = 44;
const ROWS = 19;
const RAD_PER_MS = 0.0024;

function contactsFor(count: number): Contact[] {
  return Array.from({ length: count }, (_, i) => ({
    theta: (i * 2.399) % (Math.PI * 2),
    r: 0.3 + ((i * 0.37) % 0.6),
  }));
}

export function Thinking({ steps, active, startedAt, endedAt }: ThinkingProps) {
  const elapsed = useFrame(active);
  const seconds = ((endedAt ?? Date.now()) - startedAt) / 1000;
  const contacts = useMemo(() => contactsFor(steps.length + 2), [steps.length]);
  const frame = radarFrame(COLS, ROWS, elapsed * RAD_PER_MS, contacts);
  const visible = steps.slice(-3);
  return (
    <div className="mt-5 flex items-start gap-11 animate-fade-up max-md:flex-col-reverse max-md:gap-3">
      <div className="min-w-0 flex-1 pt-2">
        <div className="flex items-center gap-2.5">
          <span className={cn("text-[14.5px] font-medium", active && "shimmer")}>
            {active ? "Testing" : "Tested"}
          </span>
          <span className="font-mono text-xs text-ink-3">{seconds.toFixed(1)}s</span>
        </div>
        <ol className="mt-2.5 flex flex-col gap-2.5" aria-live="polite">
          {visible.map((s, i) => (
            <li
              key={`${steps.length - visible.length + i}-${s}`}
              className={cn(
                "animate-slot-in text-[13px] leading-snug",
                i === visible.length - 1 ? "text-foreground" : "text-ink-3",
              )}
            >
              {s}
            </li>
          ))}
        </ol>
      </div>
      <AsciiArt
        text={frame}
        label="Hunch replaying the hunch"
        className="w-[300px] max-w-full text-ink-2"
      />
    </div>
  );
}
