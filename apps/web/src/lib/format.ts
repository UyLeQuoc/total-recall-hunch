const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});
const usdWhole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const clock = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "UTC",
});
const hm = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});
const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });

export const money = (v: number) => usd.format(v);
export const wholeDollars = (v: number) => usdWhole.format(v);
export const utcClock = (iso: string) => `${clock.format(new Date(iso))} UTC`;
export const utcMinute = (iso: string) => hm.format(new Date(iso));
export const pct = (p: number) => `${Math.round(p * 100)}%`;
export const brier = (b: number | null) => (b === null ? "n/a" : b.toFixed(3));

export function dayLabel(day: string, today: string): string {
  if (day === today) return "today";
  return weekday.format(new Date(`${day}T12:00:00Z`)).toLowerCase();
}

export function countdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function signedPct(from: number, to: number): string {
  const change = ((to - from) / from) * 100;
  return `${change >= 0 ? "+" : ""}${change.toFixed(3)}%`;
}
