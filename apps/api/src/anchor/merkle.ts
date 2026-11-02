import { createHash } from "node:crypto";

export function sha256Hex(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

function pair(a: string, b: string): string {
  const [lo, hi] = a < b ? [a, b] : [b, a];
  return sha256Hex(Buffer.from(lo + hi, "hex"));
}

export interface MerkleTree {
  root: string;
  proofs: string[][];
}

export function buildTree(leaves: string[]): MerkleTree {
  if (leaves.length === 0) throw new Error("a Merkle tree needs at least one leaf");
  const proofs: string[][] = leaves.map(() => []);
  let level = leaves.map((leaf, i) => ({ hash: leaf, members: [i] }));
  while (level.length > 1) {
    const next: { hash: string; members: number[] }[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1];
      if (!left) continue;
      if (!right) {
        next.push(left);
        continue;
      }
      for (const m of left.members) proofs[m]?.push(right.hash);
      for (const m of right.members) proofs[m]?.push(left.hash);
      next.push({
        hash: pair(left.hash, right.hash),
        members: [...left.members, ...right.members],
      });
    }
    level = next;
  }
  const top = level[0];
  if (!top) throw new Error("the tree has no root");
  return { root: top.hash, proofs };
}

export function rootFromProof(leaf: string, proof: string[]): string {
  return proof.reduce((acc, sibling) => pair(acc, sibling), leaf);
}
