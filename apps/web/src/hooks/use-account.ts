import { useCallback, useState, useSyncExternalStore } from "react";
import { z } from "zod";
import { getAccount, setAccount, subscribe } from "@/lib/account-store";
import { ApiError, fetchJson } from "@/lib/api";
import { type Signer, testSigner, walletNames, walletSigner } from "@/lib/wallet";
import { useVisitor } from "./use-visitor";

const challengeSchema = z.object({ message: z.string() });
const delegateSchema = z.object({
  token: z.string(),
  delegation: z.object({
    address: z.string(),
    until: z.string(),
    perDay: z.number(),
    test: z.boolean(),
  }),
});

export type SignInMethod = { kind: "test" } | { kind: "wallet"; name: string };

export function useAccount() {
  const account = useSyncExternalStore(subscribe, getAccount, () => null);
  const visitor = useVisitor();
  const [status, setStatus] = useState<"idle" | "signing">("idle");
  const [problem, setProblem] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const signIn = useCallback(
    async (method: SignInMethod) => {
      setStatus("signing");
      setProblem(null);
      try {
        const signer: Signer =
          method.kind === "test" ? testSigner() : await walletSigner(method.name);
        const { message } = await fetchJson(
          `/api/auth/challenge?address=${signer.address}`,
          challengeSchema,
        );
        setPreview(message);
        const signature = await signer.sign(message);
        const res = await fetchJson("/api/auth/delegate", delegateSchema, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message, signature, test: method.kind === "test", visitor }),
        });
        setAccount({
          address: res.delegation.address,
          token: res.token,
          test: res.delegation.test,
          until: res.delegation.until,
          perDay: res.delegation.perDay,
        });
      } catch (err) {
        setProblem(
          err instanceof ApiError || err instanceof Error ? err.message : "Signing didn't finish.",
        );
      } finally {
        setStatus("idle");
      }
    },
    [visitor],
  );

  const signOut = useCallback(() => setAccount(null), []);

  return { account, status, problem, preview, wallets: walletNames(), signIn, signOut };
}
