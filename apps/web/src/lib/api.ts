import { z } from "zod";

const errorBody = z.object({ error: z.string() });

export class ApiError extends Error {}

async function sentence(res: Response): Promise<string> {
  const body = errorBody.safeParse(await res.json().catch(() => null));
  return body.success
    ? body.data.error
    : `The server answered ${res.status}. Try again in a moment.`;
}

export async function fetchJson<S extends z.ZodType>(
  url: string,
  schema: S,
  init?: RequestInit,
): Promise<z.infer<S>> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError("Hunch can't reach its server. Is the API running?");
  }
  if (!res.ok) throw new ApiError(await sentence(res));
  const parsed = schema.safeParse(await res.json());
  if (!parsed.success)
    throw new ApiError("The server sent something this page doesn't understand.");
  return parsed.data;
}

export async function postSse(
  url: string,
  body: unknown,
  headers: Record<string, string>,
  signal: AbortSignal,
  onEvent: (data: unknown) => void,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (signal.aborted) throw err;
    throw new ApiError("Hunch can't reach its server. Is the API running?");
  }
  if (!res.ok || !res.body) throw new ApiError(await sentence(res));
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let cut = buffer.indexOf("\n\n");
    while (cut >= 0) {
      const chunk = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      const data = chunk
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trimStart())
        .join("\n");
      if (data) onEvent(JSON.parse(data));
      cut = buffer.indexOf("\n\n");
    }
  }
}
