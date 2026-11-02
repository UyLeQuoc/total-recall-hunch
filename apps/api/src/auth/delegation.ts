export interface DelegationTerms {
  address: string;
  agent: string;
  until: string;
  perDay: number;
  nonce: string;
}

const HEADER = "Hunch may sign picks for me.";

export function delegationMessage(t: DelegationTerms): string {
  return [
    HEADER,
    "",
    `Address: ${t.address}`,
    `Agent: ${t.agent}`,
    `Until: ${t.until}`,
    `At most: ${t.perDay} picks a day`,
    `Nonce: ${t.nonce}`,
    "",
    "This signs no transaction and moves no funds. Picks are forecasts, not bets.",
  ].join("\n");
}

function field(lines: string[], name: string): string | undefined {
  const line = lines.find((l) => l.startsWith(`${name}: `));
  return line?.slice(name.length + 2).trim();
}

export function parseDelegation(message: string): DelegationTerms | undefined {
  const lines = message.split("\n");
  if (lines[0] !== HEADER) return undefined;
  const address = field(lines, "Address");
  const agent = field(lines, "Agent");
  const until = field(lines, "Until");
  const perDay = Number(field(lines, "At most")?.split(" ")[0]);
  const nonce = field(lines, "Nonce");
  if (!address || !agent || !until || !nonce || !Number.isInteger(perDay)) return undefined;
  if (!/^0x[0-9a-f]{64}$/.test(address) || !/^\d{4}-\d{2}-\d{2}$/.test(until)) return undefined;
  const terms = { address, agent, until, perDay, nonce };
  return delegationMessage(terms) === message ? terms : undefined;
}

export function endOfDay(until: string): Date {
  return new Date(`${until}T23:59:59.999Z`);
}
