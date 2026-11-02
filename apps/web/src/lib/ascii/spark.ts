import { VERTICAL_RAMP } from "./grid.ts";

export function sparkline(values: number[], width: number, domain?: [number, number]): string {
  const tail = values.slice(-width);
  if (tail.length === 0) return "·".repeat(width);
  const lo = domain?.[0] ?? Math.min(...tail);
  const hi = domain?.[1] ?? Math.max(...tail);
  const steps = VERTICAL_RAMP.length - 2;
  const line = tail
    .map((v) => {
      if (hi - lo < 1e-9) return "▄";
      const k = Math.round(((v - lo) / (hi - lo)) * steps) + 1;
      return VERTICAL_RAMP[Math.min(Math.max(k, 1), steps + 1)] ?? "▄";
    })
    .join("");
  return line.padStart(width, " ");
}
