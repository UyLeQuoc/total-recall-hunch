import { z } from "zod";

const KEY = "hunch.account";

const accountSchema = z.object({
  address: z.string(),
  token: z.string(),
  test: z.boolean(),
  until: z.string(),
  perDay: z.number(),
});

export type Account = z.infer<typeof accountSchema>;

function read(): Account | null {
  try {
    const parsed = accountSchema.safeParse(JSON.parse(localStorage.getItem(KEY) ?? "null"));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

let current: Account | null = typeof localStorage === "undefined" ? null : read();
const listeners = new Set<() => void>();

export function getAccount(): Account | null {
  return current;
}

export function setAccount(next: Account | null): void {
  current = next;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    // Storage can be blocked; the session still lives for this tab.
  }
  for (const l of listeners) l();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function authHeaders(visitor: string): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-hunch-visitor": visitor,
    ...(current ? { authorization: `Bearer ${current.token}` } : {}),
  };
}
