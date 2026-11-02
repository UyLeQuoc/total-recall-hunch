import { z } from "zod";

const visitor = z.string().uuid();

export function ownerOf(header: string | undefined): string {
  const parsed = visitor.safeParse(header);
  return parsed.success ? `visitor:${parsed.data}` : "visitor:anonymous";
}
