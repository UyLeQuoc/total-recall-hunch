import { blank, put, render } from "./grid.ts";

export interface Contact {
  theta: number;
  r: number;
}

const TAU = Math.PI * 2;
const TRAIL = 0.9;
const SWEEP = ["▓", "▒", "░", "·", "·"];

function behind(angle: number, theta: number): number {
  return (((angle - theta) % TAU) + TAU) % TAU;
}

export function radarFrame(cols: number, rows: number, angle: number, contacts: Contact[]): string {
  const grid = blank(rows, cols);
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const dx = (x - cx) / (cols / 2);
      const dy = (y - cy) / (rows / 2);
      const d = Math.hypot(dx, dy);
      if (d > 1.02) continue;
      const theta = Math.atan2(-dy, dx);
      const lag = behind(angle, theta);
      let ch = " ";
      if (Math.abs(d - 1) < 0.06) ch = "·";
      else if (Math.abs(d - 0.5) < 0.04 && x % 2 === 0) ch = "·";
      else if (y === Math.round(cy)) ch = "┈";
      else if (x === Math.round(cx)) ch = "┊";
      if (d < 0.98 && lag < TRAIL)
        ch = SWEEP[Math.min(Math.floor((lag / TRAIL) * SWEEP.length), SWEEP.length - 1)] ?? ch;
      if (ch !== " ") put(grid, y, x, ch);
    }
  }
  put(grid, Math.round(cy), Math.round(cx), "┼");
  for (const c of contacts) {
    const x = Math.round(cx + c.r * Math.cos(c.theta) * (cols / 2));
    const y = Math.round(cy - c.r * Math.sin(c.theta) * (rows / 2));
    const lag = behind(angle, c.theta);
    const mark = lag < 0.6 ? "◆" : lag < 2.2 ? "◇" : lag < 4 ? "·" : "";
    if (mark) put(grid, y, x, mark);
  }
  return render(grid);
}
