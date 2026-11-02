import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface AsciiArtProps {
  text: string;
  label: string;
  className?: string;
}

export function AsciiArt({ text, label, className }: AsciiArtProps) {
  const cols = Math.max(...text.split("\n").map((l) => [...l].length), 1);
  const style = { "--cols": cols } as CSSProperties;
  return (
    <div className={cn("ascii w-full", className)}>
      <pre className="ascii-art" style={style} role="img" aria-label={label}>
        {text}
      </pre>
    </div>
  );
}
