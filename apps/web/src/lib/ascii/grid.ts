export type Grid = string[][];

export function blank(rows: number, cols: number): Grid {
  return Array.from({ length: rows }, () => new Array<string>(cols).fill(" "));
}

export function put(grid: Grid, row: number, col: number, text: string): void {
  const line = grid[row];
  if (!line) return;
  [...text].forEach((ch, i) => {
    const c = col + i;
    if (c >= 0 && c < line.length) line[c] = ch;
  });
}

export function at(grid: Grid, row: number, col: number): string {
  return grid[row]?.[col] ?? " ";
}

export function render(grid: Grid): string {
  return grid.map((line) => line.join("").replace(/\s+$/, "")).join("\n");
}

export function center(text: string, width: number): string {
  const left = Math.max(Math.floor((width - text.length) / 2), 0);
  return `${" ".repeat(left)}${text}`.padEnd(width).slice(0, width);
}

export const VERTICAL_RAMP = [" ", "▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
export const HORIZONTAL_RAMP = ["", "▏", "▎", "▍", "▌", "▋", "▊", "▉", "█"];
