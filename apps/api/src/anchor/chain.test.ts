import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { describe, expect, it } from "vitest";
import { anchorEventType, parseBuildDump, signerFromSuiPrivateKey } from "./chain.ts";

describe("anchor chain helpers", () => {
  it("names the event with the full package address", () => {
    expect(anchorEventType("0x2a")).toBe(
      "0x000000000000000000000000000000000000000000000000000000000000002a::anchor::Anchored",
    );
  });

  it("reads the bytecode out of sui move build's output, past the build log", () => {
    const dump = parseBuildDump(
      'BUILDING hunch\n{"modules":["oRzr"],"dependencies":["0x1","0x2"],"digest":[1]}',
    );
    expect(dump).toEqual({ modules: ["oRzr"], dependencies: ["0x1", "0x2"] });
  });

  it("refuses a build with no modules", () => {
    expect(() => parseBuildDump('{"modules":[],"dependencies":[]}')).toThrow();
  });

  it("turns a suiprivkey back into the same signer", () => {
    const keypair = new Ed25519Keypair();
    expect(signerFromSuiPrivateKey(keypair.getSecretKey()).toSuiAddress()).toBe(
      keypair.toSuiAddress(),
    );
  });
});
