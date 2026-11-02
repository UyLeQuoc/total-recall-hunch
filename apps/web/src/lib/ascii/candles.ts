import { at, blank, put, render } from "./grid.ts";

export interface Ohlc {
  open: number;
  high: number;
  low: number;
  close: number;
  label: string;
}

export interface CandleOptions {
  rows: number;
  entry?: number;
  price?: number;
  format: (v: number) => string;
}

const STEP = 4;

function candle(c: Ohlc, rowOf: (v: number) => number): { row: number; text: string }[] {
  const top = rowOf(c.high);
  const bottom = rowOf(c.low);
  const bodyTop = rowOf(Math.max(c.open, c.close));
  const bodyBottom = rowOf(Math.min(c.open, c.close));
  const down = c.close < c.open;
  const out: { row: number; text: string }[] = [];
  for (let r = top; r <= bottom; r++) {
    if (r < bodyTop || r > bodyBottom) out.push({ row: r, text: " │ " });
    else if (down) out.push({ row: r, text: "███" });
    else if (bodyTop === bodyBottom) out.push({ row: r, text: "├─┤" });
    else if (r === bodyTop) out.push({ row: r, text: top < bodyTop ? "┌┴┐" : "┌─┐" });
    else if (r === bodyBottom) out.push({ row: r, text: bottom > bodyBottom ? "└┬┘" : "└─┘" });
    else out.push({ row: r, text: "│ │" });
  }
  return out;
}

export function candles(series: Ohlc[], opts: CandleOptions): string {
  const { rows, entry, price, format } = opts;
  const width = series.length * STEP;
  const levels = series.flatMap((c) => [c.high, c.low]);
  if (entry !== undefined) levels.push(entry);
  if (price !== undefined) levels.push(price);
  const lo = Math.min(...levels);
  const hi = Math.max(...levels);
  const span = Math.max(hi - lo, hi * 1e-5);
  const rowOf = (v: number) => Math.round(((hi - v) / span) * (rows - 1));
  const grid = blank(rows + 2, width + 22);

  series.forEach((c, i) => {
    for (const { row, text } of candle(c, rowOf)) put(grid, row, i * STEP, text);
  });

  const labels = new Map<number, string>([
    [0, format(hi)],
    [rows - 1, format(lo)],
  ]);
  if (price !== undefined) labels.set(rowOf(price), `${format(price)} now`);
  if (entry !== undefined) {
    const r = rowOf(entry);
    for (let x = 0; x < width; x++) if (at(grid, r, x) === " ") put(grid, r, x, "┄");
    labels.set(r, `${format(entry)} entry`);
  }
  for (let r = 0; r < rows; r++) {
    const label = labels.get(r);
    const joint = entry !== undefined && r === rowOf(entry) ? "├" : "┤";
    put(grid, r, width, label ? `${joint} ${label}` : "│");
  }
  put(grid, rows, 0, `${"─".repeat(width)}┘`);
  const first = series[0]?.label ?? "";
  const last = series.at(-1)?.label ?? "";
  put(grid, rows + 1, 0, first);
  put(grid, rows + 1, Math.max(width - last.length - 1, first.length + 2), last);
  return render(grid);
}
