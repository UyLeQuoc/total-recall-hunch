const LEVELS = ["▂", "▄", "▆", "█"];

export function uptimeRow(counts: number[]): string {
  const max = Math.max(...counts, 1);
  return counts
    .map((n) => {
      if (n <= 0) return "·";
      const k = Math.min(Math.ceil((n / max) * LEVELS.length) - 1, LEVELS.length - 1);
      return LEVELS[Math.max(k, 0)] ?? "█";
    })
    .join("");
}
