import { useState } from "react";

const KEY = "hunch.visitor";

function readOrCreate(): string {
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function useVisitor(): string {
  const [id] = useState(readOrCreate);
  return id;
}
