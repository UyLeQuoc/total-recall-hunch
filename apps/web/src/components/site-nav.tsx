import { Link, useLocation } from "wouter";
import { useAccount } from "@/hooks/use-account";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "hunch" },
  { href: "/games", label: "tonight" },
  { href: "/learning", label: "learning" },
  { href: "/status", label: "status" },
];

export function SiteNav() {
  const [location] = useLocation();
  const { account } = useAccount();
  return (
    <header className="mx-auto flex w-full max-w-[752px] items-baseline justify-between px-4 pt-4 font-mono text-xs">
      <nav className="flex gap-4" aria-label="Pages">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={location === l.href ? "page" : undefined}
            className={cn(
              "-mx-[0.5ch] px-[0.5ch] text-muted-foreground hover:bg-foreground hover:text-background",
              location === l.href && "bg-foreground text-background",
            )}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <Link
        href="/me"
        aria-current={location === "/me" ? "page" : undefined}
        className={cn(
          "-mx-[0.5ch] px-[0.5ch] text-muted-foreground hover:bg-foreground hover:text-background",
          location === "/me" && "bg-foreground text-background",
        )}
      >
        {account
          ? `${account.address.slice(0, 6)}…${account.address.slice(-4)}${account.test ? " (test)" : ""}`
          : "sign in"}
      </Link>
    </header>
  );
}
