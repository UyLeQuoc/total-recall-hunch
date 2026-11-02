import { Badge } from "@/components/ui/badge";
import { EXAMPLES } from "./examples";

interface SuggestionsProps {
  onPick: (hunch: string) => void;
}

export function Suggestions({ onPick }: SuggestionsProps) {
  return (
    <ul className="mt-11 flex flex-wrap gap-2 max-md:mt-7" aria-label="Example hunches">
      {EXAMPLES.map((text, i) => (
        <li key={text} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
          <Badge
            asChild
            variant="outline"
            className="cursor-pointer bg-secondary text-left whitespace-normal text-secondary-foreground hover:bg-accent hover:text-foreground"
          >
            <button type="button" onClick={() => onPick(text)}>
              {text}
            </button>
          </Badge>
        </li>
      ))}
    </ul>
  );
}
