import { blank, put, render } from "./grid.ts";

export interface Series {
  label: string;
  mark: string;
  values: number[];
}

function sample(values: number[], width: number): number[] {
  if (values.length <= 1) return values;
  return Array.from({ length: Math.min(width, values.length) }, (_, i) => {
    const at = Math.round((i * (values.length - 1)) / (Math.min(width, values.length) - 1));
    return values[at] ?? 0;
  });
}

export function lineChart(
  series: Series[],
  width: number,
  height: number,
  format: (v: number) => string,
): string {
  const all = series.flatMap((s) => s.values);
  if (all.length === 0) return "";
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const span = Math.max(hi - lo, 1e-6);
  const axis = Math.max(format(hi).length, format(lo).length);
  const grid = blank(height + 2, axis + 2 + width);
  for (let r = 0; r < height; r++) {
    const label = r === 0 ? format(hi) : r === height - 1 ? format(lo) : "";
    put(grid, r, 0, label.padStart(axis));
    put(grid, r, axis + 1, label ? "┤" : "│");
  }
  put(grid, height, axis + 1, `└${"─".repeat(width)}`);
  for (const s of series) {
    sample(s.values, width).forEach((v, i, arr) => {
      const x = arr.length <= 1 ? 0 : Math.round((i * (width - 1)) / (arr.length - 1));
      const row = Math.round(((hi - v) / span) * (height - 1));
      put(grid, row, axis + 2 + x, s.mark);
    });
  }
  put(grid, height + 1, axis + 2, series.map((s) => `${s.mark} ${s.label}`).join("   "));
  return render(grid);
}
