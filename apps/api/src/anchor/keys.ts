import { addressFromSignature } from "@hunch/memory";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

export interface Agent {
  address: string;
  sign: (hash: string) => Promise<string>;
}

export function keypairFromKey(key: string): Ed25519Keypair {
  const decoded = decodeSuiPrivateKey(key);
  if (decoded.scheme !== "ED25519") throw new Error("expected an Ed25519 key");
  return Ed25519Keypair.fromSecretKey(decoded.secretKey);
}

export function agentFrom(keypair: Ed25519Keypair): Agent {
  return {
    address: keypair.toSuiAddress().toLowerCase(),
    sign: async (hash) => {
      const { signature } = await keypair.signPersonalMessage(new TextEncoder().encode(hash));
      return signature;
    },
  };
}

export async function signedBy(hash: string, signature: string): Promise<string | null> {
  return addressFromSignature(hash, signature);
}
