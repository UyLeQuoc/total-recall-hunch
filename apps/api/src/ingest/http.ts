import type { z } from "zod";

const MIN_GAP_MS = 220;
const lastCall = new Map<string, Promise<void>>();

function paceHost(host: string): Promise<void> {
  const previous = lastCall.get(host) ?? Promise.resolve();
  const next = previous.then(() => new Promise<void>((r) => setTimeout(r, MIN_GAP_MS)));
  lastCall.set(host, next);
  return previous;
}

export class SourceError extends Error {
  constructor(
    readonly host: string,
    readonly status: number,
  ) {
    super(`${host} answered ${status}`);
  }
}

export async function getJson<S extends z.ZodType>(url: string, schema: S): Promise<z.infer<S>> {
  const host = new URL(url).host;
  await paceHost(host);
  const res = await fetch(url, {
    headers: { accept: "application/json", "user-agent": "hunch/0.0.1" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new SourceError(host, res.status);
  const parsed = schema.safeParse(await res.json());
  if (!parsed.success) throw new Error(`${host} sent an unexpected shape: ${parsed.error.message}`);
  return parsed.data;
}
