import { HORIZONTAL_RAMP } from "./grid.ts";

export interface MeterRow {
  label: string;
  value: number | null;
}

export function bar(value: number, max: number, width: number): string {
  const cells = Math.min(Math.max(value / max, 0), 1) * width;
  const full = Math.floor(cells);
  const part = HORIZONTAL_RAMP[Math.round((cells - full) * 8)] ?? "";
  const filled = `${"█".repeat(full)}${full < width ? part : ""}`;
  return filled + "░".repeat(Math.max(width - [...filled].length, 0));
}

export function meter(rows: MeterRow[], width = 24, digits = 3): string {
  const max = Math.max(...rows.map((r) => r.value ?? 0), 1e-9) * 1.1;
  const labelWidth = Math.max(...rows.map((r) => r.label.length));
  return rows
    .map((r) => {
      const label = r.label.padEnd(labelWidth);
      if (r.value === null) return `${label}  ${"·".repeat(width)}  n/a`;
      return `${label}  ${bar(r.value, max, width)}  ${r.value.toFixed(digits)}`;
    })
    .join("\n");
}
