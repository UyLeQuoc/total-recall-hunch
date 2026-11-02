import { describe, expect, it } from "vitest";
import { canonical, hashPayload } from "./payload.ts";

describe("payload", () => {
  it("orders keys so the same pick always hashes the same", () => {
    expect(canonical({ b: 1, a: { d: [2, 1], c: "x" } })).toBe('{"a":{"c":"x","d":[2,1]},"b":1}');
    expect(hashPayload({ a: 1, b: 2 })).toBe(hashPayload({ b: 2, a: 1 }));
  });

  it("changes the hash when any field changes", () => {
    expect(hashPayload({ side: "home", confidence: 0.6 })).not.toBe(
      hashPayload({ side: "home", confidence: 0.61 }),
    );
  });
});
