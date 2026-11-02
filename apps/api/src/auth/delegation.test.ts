import { describe, expect, it } from "vitest";
import { delegationMessage, parseDelegation } from "./delegation.ts";

const terms = {
  address: `0x${"a".repeat(64)}`,
  agent: `0x${"b".repeat(64)}`,
  until: "2026-11-30",
  perDay: 20,
  nonce: "n1",
};

describe("delegation", () => {
  it("round-trips the message a wallet signs", () => {
    expect(parseDelegation(delegationMessage(terms))).toEqual(terms);
  });

  it("names the limits in plain words", () => {
    expect(delegationMessage(terms)).toContain("At most: 20 picks a day");
    expect(delegationMessage(terms)).toContain("Until: 2026-11-30");
  });

  it("refuses a message that isn't exactly the template", () => {
    expect(parseDelegation(`${delegationMessage(terms)}\nExtra: yes`)).toBeUndefined();
    expect(parseDelegation(delegationMessage(terms).replace("Until:", "Until "))).toBeUndefined();
    expect(parseDelegation("Sign in to Hunch.")).toBeUndefined();
  });
});
