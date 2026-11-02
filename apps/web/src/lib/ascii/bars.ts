import { blank, center, put, render, VERTICAL_RAMP } from "./grid.ts";

export interface DayBar {
  label: string;
  fires: number;
  right: number;
}

const BAR = 4;
const SLOT = 6;

export function dayBars(days: DayBar[], height = 8, progress = 1): string {
  const max = Math.max(1, ...days.map((d) => d.fires));
  const axis = String(max).length;
  const cols = axis + 2 + days.length * SLOT;
  const grid = blank(height + 3, cols);
  const scale = (height / max) * Math.min(Math.max(progress, 0), 1);
  const plotTop = 1;
  const base = plotTop + height;

  const half = Math.round(max / 2);
  const midRow = half > 0 && half < max ? Math.round((half / max) * height) - 1 : -1;
  for (let k = 0; k < height; k++) {
    const row = base - 1 - k;
    const tick = k === height - 1 ? String(max) : k === midRow ? String(half) : "";
    put(grid, row, 0, tick.padStart(axis));
    put(grid, row, axis + 1, tick ? "┤" : "│");
  }
  put(grid, base, 0, "0".padStart(axis));
  put(grid, base, axis + 1, `└${"─".repeat(days.length * SLOT)}`);

  days.forEach((day, i) => {
    const x = axis + 2 + i * SLOT + 1;
    const total = day.fires * scale;
    const solid = day.right * scale;
    for (let k = 0; k < height; k++) {
      const row = base - 1 - k;
      let cell = " ";
      if (k < Math.floor(solid)) cell = "█";
      else if (k === Math.floor(solid) && solid % 1 > 0.12) {
        cell = VERTICAL_RAMP[Math.round((solid % 1) * 8)] ?? "█";
      } else if (k < Math.round(total)) cell = "░";
      if (cell !== " ") put(grid, row, x, cell.repeat(BAR));
    }
    if (day.fires > 0) {
      const labelRow = Math.max(base - 1 - Math.round(total), 0);
      put(grid, labelRow, x - 1, center(`${day.right}/${day.fires}`, SLOT));
    }
    put(grid, base + 1, x - 1, center(day.label, SLOT));
  });
  return render(grid);
}
