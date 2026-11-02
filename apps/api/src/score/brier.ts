export function brier(confidence: number, right: boolean): number {
  const y = right ? 1 : 0;
  return (confidence - y) ** 2;
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
