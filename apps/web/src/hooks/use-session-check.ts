import { useEffect } from "react";
import { z } from "zod";
import { authHeaders, getAccount, setAccount } from "@/lib/account-store";
import { fetchJson } from "@/lib/api";
import { useVisitor } from "./use-visitor";

const meSchema = z.object({ address: z.string().nullable() });

export function useSessionCheck(): void {
  const visitor = useVisitor();
  useEffect(() => {
    const account = getAccount();
    if (!account) return;
    fetchJson("/api/auth/me", meSchema, { headers: authHeaders(visitor) })
      .then((me) => {
        if (me.address !== account.address) setAccount(null);
      })
      .catch(() => undefined);
  }, [visitor]);
}
