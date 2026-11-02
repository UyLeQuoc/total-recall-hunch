import { describe, expect, it } from "vitest";
import { buildTree, rootFromProof, sha256Hex } from "./merkle.ts";

const leaves = ["a", "b", "c", "d", "e"].map((s) => sha256Hex(s));

describe("merkle", () => {
  it("proves every leaf back to the root, odd counts included", () => {
    for (const n of [1, 2, 3, 5]) {
      const subset = leaves.slice(0, n);
      const tree = buildTree(subset);
      subset.forEach((leaf, i) => {
        expect(rootFromProof(leaf, tree.proofs[i] ?? [])).toBe(tree.root);
      });
    }
  });

  it("fails the proof when a leaf changes", () => {
    const tree = buildTree(leaves);
    expect(rootFromProof(sha256Hex("tampered"), tree.proofs[2] ?? [])).not.toBe(tree.root);
  });

  it("gives a single leaf as its own root", () => {
    expect(buildTree([leaves[0] ?? ""]).root).toBe(leaves[0]);
  });
});
