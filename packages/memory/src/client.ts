import { MemWal } from "@mysten-incubation/memwal";

/**
 * Where Hunch keeps what it learned (docs/prd.md §10). One typed line per memory; Postgres does the
 * math, memory holds the conclusions the product acts on.
 */
export const NAMESPACE = {
  /** RULE and PROVEN lines: what a user believes, how the rule changed, which hunches held up. */
  rules: (user: string) => `rules:${user}`,
  /** PICK lines: what a user's rules said, with each pick's anchor. */
  picks: (user: string) => `picks:${user}`,
  /** TRUST lines: each voice's record per context. The agent's weights, recalled newest first. */
  trust: "trust:public",
  /** SPLIT lines: which side won when the sources disagreed. */
  radar: "radar:public",
} as const;

/** Everything needed to talk to one (account, namespace) through the relayer. */
export interface MemoryScope {
  key: string;
  accountId: string;
  namespace: string;
  serverUrl: string;
}

export function scope(
  operator: { key: string; accountId: string; serverUrl: string },
  namespace: string,
): MemoryScope {
  return { ...operator, namespace };
}

export function createClient(s: MemoryScope): MemWal {
  return MemWal.create({
    key: s.key,
    accountId: s.accountId,
    serverUrl: s.serverUrl,
    namespace: s.namespace,
  });
}
