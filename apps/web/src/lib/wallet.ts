import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import {
  getWallets,
  isWalletWithRequiredFeatureSet,
  type SuiSignPersonalMessageFeature,
  type Wallet,
} from "@mysten/wallet-standard";

const TEST_KEY = "hunch.testKey";

export interface Signer {
  address: string;
  sign: (message: string) => Promise<string>;
}

function suiWallets() {
  return getWallets()
    .get()
    .filter((w: Wallet) =>
      isWalletWithRequiredFeatureSet<SuiSignPersonalMessageFeature>(w, ["sui:signPersonalMessage"]),
    );
}

export function walletNames(): string[] {
  return suiWallets().map((w) => w.name);
}

export async function walletSigner(name: string): Promise<Signer> {
  const wallet = suiWallets().find((w) => w.name === name);
  if (!wallet) throw new Error(`${name} isn't available in this browser.`);
  const { accounts } = await wallet.features["standard:connect"].connect();
  const account = accounts[0] ?? wallet.accounts[0];
  if (!account) throw new Error(`${name} didn't share an account.`);
  return {
    address: account.address.toLowerCase(),
    sign: async (message) => {
      const out = await wallet.features["sui:signPersonalMessage"].signPersonalMessage({
        message: new TextEncoder().encode(message),
        account,
        chain: "sui:testnet",
      });
      return out.signature;
    },
  };
}

function testKeypair(): Ed25519Keypair {
  try {
    const saved = localStorage.getItem(TEST_KEY);
    if (saved) return Ed25519Keypair.fromSecretKey(saved);
    const fresh = new Ed25519Keypair();
    localStorage.setItem(TEST_KEY, fresh.getSecretKey());
    return fresh;
  } catch {
    return new Ed25519Keypair();
  }
}

export function testSigner(): Signer {
  const keypair = testKeypair();
  return {
    address: keypair.toSuiAddress().toLowerCase(),
    sign: async (message) =>
      (await keypair.signPersonalMessage(new TextEncoder().encode(message))).signature,
  };
}
