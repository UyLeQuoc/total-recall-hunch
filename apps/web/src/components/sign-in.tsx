import { Button } from "@/components/ui/button";
import { useAccount } from "@/hooks/use-account";

interface SignInProps {
  reason: string;
}

export function SignIn({ reason }: SignInProps) {
  const { status, problem, preview, wallets, signIn } = useAccount();
  return (
    <section className="flex flex-col gap-3 animate-fade-up">
      <p className="text-[15px] leading-[1.9]">{reason}</p>
      <p className="text-[13px] text-ink-3">
        You sign one message, once: Hunch may sign picks for you until a date, at most 20 a day. It
        signs no transaction and moves no funds.
      </p>
      <div className="flex flex-wrap gap-2">
        {wallets.map((name) => (
          <Button
            key={name}
            size="sm"
            disabled={status === "signing"}
            onClick={() => void signIn({ kind: "wallet", name })}
          >
            Sign with {name}
          </Button>
        ))}
        <Button
          size="sm"
          variant={wallets.length > 0 ? "outline" : "default"}
          disabled={status === "signing"}
          onClick={() => void signIn({ kind: "test" })}
        >
          Use a test key (test)
        </Button>
      </div>
      {wallets.length === 0 && (
        <p className="text-[12.5px] text-ink-3">
          No Sui wallet in this browser. The test key lives in this browser only and is labelled
          (test) on every pick.
        </p>
      )}
      {preview && status === "signing" && (
        <pre className="rounded-lg bg-muted px-3.5 py-3 font-mono text-[12px] leading-relaxed whitespace-pre-wrap">
          {preview}
        </pre>
      )}
      {problem && <p className="text-[13px] text-miss">{problem}</p>}
    </section>
  );
}
